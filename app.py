import datetime
import os
import sys
from flask import (Flask, flash, redirect, render_template, request,
                   session, url_for, jsonify,
                   send_from_directory, send_file)
import requests
from passlib.apps import custom_app_context as pwd_context
from flask_session import Session
from flask_sqlalchemy import SQLAlchemy
from flask_jsglue import JSGlue
from config import getKeys
import psycopg2
import psycopg2.extras
import json
import datetime
from pymongo import MongoClient
import traceback
from helpers import App_Actions
from services import Email_Service, GSpread
from tempfile import mkdtemp
import string
import random
from werkzeug import secure_filename
# import xlwt
from xlwt import Workbook
import xlrd
from copy import deepcopy as deep_copy
import stripe
import gspread
from oauth2client.service_account import ServiceAccountCredentials
from threading import Thread
from email.utils import parseaddr
import phonenumbers

GSpread_dependencies = {'gspread': gspread, "SAC": ServiceAccountCredentials}

Email_Service_dependencies = {'Thread': Thread}
Email_Service_dependencies["requests"] = requests

App_Actions_dependencies = {'random': random}
App_Actions_dependencies['traceback'] = traceback
App_Actions_dependencies['MongoClient'] = MongoClient
App_Actions_dependencies['datetime'] = datetime
App_Actions_dependencies['pwd_context'] = pwd_context
App_Actions_dependencies['string'] = string

settings = getKeys(os)

Controllers = App_Actions(settings, **App_Actions_dependencies)
Email_Service = Email_Service(settings, **Email_Service_dependencies)
Sheets_Service = GSpread(**GSpread_dependencies)

settings['SECRET_KEY'] = os.environ.get('SECRET_KEY', Controllers.get_salt(25))

app = Flask(__name__)
PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(PROJECT_ROOT, 'static')
app.static_path = STATIC_ROOT

jsglue = JSGlue(app)

app.jinja_env.add_extension('jinja2.ext.loopcontrols')
# app.config["SESSION_FILE_DIR"] = mkdtemp()
app.config["SESSION_PERMANENT"] = False
app.config["SESSION_TYPE"] = "filesystem"
app.config['TEMPLATES_AUTO_RELOAD'] = True

app.config.update({
    'SECRET_KEY': os.environ.get('SECRET_KEY', settings.get('SECRET_KEY'))
})


if app.config["DEBUG"]:
    @app.after_request
    def after_request(response):
        response.headers["Cache-Control"] = (
            "no-cache, no-store," +
            " must-revalidate")
        response.headers["Expires"] = 0

        response.headers["Pragma"] = "no-cache"
        return response

sess = Session()
sess.init_app(app)

"""
    app.context_processor modifies the *url_for* flask static file server
    to append ?q= + dateTime hash.
    This allows for cache busting of static files
"""


@app.context_processor
def override_url_for():
    return dict(url_for=dated_url_for)


def dated_url_for(endpoint, **values):

    if endpoint == 'static':
        filename = values.get('filename', None)
        if filename:
            file_path = os.path.join(app.root_path, app.static_path, filename)
            values['q'] = int(os.stat(file_path).st_mtime)

    # endpoint = endpoint + root if root not in endpoint else endpoint
    return url_for(endpoint, **values)


""""""


@app.route('/', methods=["POST", "GET"])
def index():
    # check for password in beta version, remove in final production
    pw = request.args.get('pw')

    if pw != settings.get('BETA_KEY') and not session.get('beta'):
        return "access denied :("

    session['beta'] = True
    # if logged in and gotten to index, reroute to scheduled orders
    if 'admin' in session:
        return redirect(url_for('scheduled_orders'))

    # get disabled dates for date picker.
    disabled = Controllers.get_disabled_dates()
    menu = Controllers.connect_to_db(Controllers.get_menu_items)
    if menu.get("status") and menu.get("return_value"):
        menu = menu.get("return_value")
    return render_template('index.html', dates=disabled, menu=menu)


@app.route('/user_orders', methods=["GET", "POST"])
def user_orders():
    if not session.get('beta'):
        return "access denied :("
    if 'user_id' not in session:
        return redirect(url_for('login'))

    user_key = session.get('user_id')
    kwargs = {'user_id': user_key}
    all_orders = Controllers.connect_to_db(Controllers.get_user_orders, kwargs)

    if all_orders.get('status'):

        all_orders = all_orders.get("return_value")
        (past_dates, upcoming_dates, errors) = Controllers.split_list_of_orders(
            all_orders, True)

        past_dates_sorted = Controllers.sort_list_of_dates(
            past_dates,
            "date", True)
        upcoming_dates_sorted = Controllers.sort_list_of_dates(
            upcoming_dates,
            "date")

        return render_template(
            'userorders.html',
            admin=False,
            upcoming_orders=upcoming_dates_sorted,
            past_orders=past_dates_sorted)
    else:
        return redirect(url_for('logout'))


@app.route('/orderlookup', methods=["GET", "POST"])
def orderlookup():
    if not session.get('beta'):
        return "access denied :("
    if request.method == "POST":

        confirmation_code = request.form.get("confirmationCode")
        if len(confirmation_code) < 5:
            return render_template('orderlookup.html', error="Invalid Code")

        kwargs = {"confirmation_code": confirmation_code}
        user_order = Controllers.connect_to_db(
            Controllers.get_order_for_code,
            kwargs)
        if user_order.get("status"):
            user_order = user_order.get("return_value")
            session['guest_code'] = confirmation_code
            return render_template("orderlookup.html", order=user_order)

        return render_template("orderlookup.html", error='No order found')
    else:
        return render_template("orderlookup.html")


@app.route('/change_password', methods=["POST"])
def change_password():
    if not session.get('beta'):
        return "access denied :("
    if 'user_id' not in session:
        return redirect(url_for('login'))

    old_password = request.form.get('current-password')
    new_password = request.form.get('new-password')
    confirm_new_password = request.form.get('confirm-new-passowrd')

    unique = session.get('user_id')

    if not old_password or not new_password or not confirm_new_password:
        return render_template('user_settings.html',
                               error='Could not validate password')
    if new_password != confirm_new_password:
        return render_template('user_settings.html',
                               error='Passwords do not match')
    if not Controllers.is_valid_password(new_password):
        return render_template('user_settings.html',
                               error='Could not validate password')

    kwargs = {"user_id": unique, "new_pass": new_password,
              'old_pass': old_password}
    change_pass_result = Controllers.connect_to_db(
        Controllers.change_user_pass, kwargs)

    if not change_pass_result.get('status') or not change_pass_result.get('return_value'):
        return render_template("user_settings.html",
                               error="Password could not be changed")

    return render_template('user_settings.html', error='New password set!')


@app.route('/forgotpassword', methods=["POST", "GET"])
def forgotpassword():
    if not session.get('beta'):
        return "access denied :("

    if request.method == "POST":

        email = request.form.get('email')
        if not email:
            return render_template('Please provide email for a recovery link')

        kwargs = {"email": email}
        does_user_exist = Controllers.connect_to_db(
            Controllers.user_exists, kwargs)

        if not does_user_exist.get("status"):
            return render_template("forgotpassword.html",
                                   error=("Something went wrong finding " +
                                          "email in our records.\n Please" +
                                          " give us a call."))

        if not does_user_exist.get("return_value"):
            return render_template('forgotpassword.html',
                                   error="Could not find email in records")
        # generate reset password link and associated code
        (set_new_pass_link, code) = Controllers.get_new_pass_link(email)
        # add email and confirmation code to database with timestap
        kwargs = {'email': email, 'code': code}
        Controllers.connect_to_db(Controllers.add_pass_recovery, kwargs)
        # start thread to send email as sending may take a minute when asleep
        thread_one = Thread(target=Email_Service.send_password_recovery,
                            args=(email, set_new_pass_link), daemon=True)
        thread_one.start()

        return render_template('forgotpassword.html',
                               error="Resent link sent! Valid for 24 hours, " +
                                     "make sure to check spam folder.\n" +
                                     " If you do not recieve an email " +
                                     "soon, please give us a call.")
    else:
        return render_template('forgotpassword.html')


@app.route('/password_recovery', methods=["POST", "GET"])
def password_recovery():
    if not session.get('beta'):
        return "access denied :("

    if request.method == "POST":
        code = session.get('recovery_code')
        email = session.get('recovery_email')

        new_password = request.form.get('new-password')
        confirm_new_password = request.form.get('confirm-new-password')

        if not new_password or not confirm_new_password or new_password != confirm_new_password:
            return render_template('password_recovery.html',
                                   error='One or more fields were empty,' +
                                         ' or passwords did not match.')

        if not Controllers.is_valid_password(new_password):
            return render_template('password_recovery.html',
                                   error=('New password does not meet' +
                                          ' password requirements'))

        kwargs = {'email': email, "new_pass": new_password}
        update_password = Controllers.connect_to_db(
            Controllers.update_user_password, kwargs)

        if not update_password.get("status") or not update_password.get("return_value"):
            return render_template("password_recovery.html",
                                   error=("Something went wrong"
                                          "updateing user password"))

        session['user_id'] = update_password.get('return_value').get("_id")
        session.pop('recovery_code')
        session.pop('recovery_email')
        return redirect(url_for('index'))

    else:
        code = request.args.get('code')
        email = request.args.get('recipient')
        print(email)
        if not code or not email:
            return render_template('forgotpassword.html',
                                   error="Could not retrieve new pass code")

        kwargs = {'code': code, 'email': email}
        validate_url_credentials = Controllers.connect_to_db(
            Controllers.check_password_recovery, kwargs)
        if not validate_url_credentials.get("status") or not validate_url_credentials.get("return_value"):
            return render_template('forgotpassword.html',
                                   error=("Could authenticate email, "
                                          "please request a new link"))

        original_timestamp = validate_url_credentials.get("return_value")

        is_less_than24hours = Controllers.is_timestamp_within_24hr(
            original_timestamp)

        if is_less_than24hours:
            session['recovery_code'] = code
            session['recovery_email'] = email
            return render_template('password_recovery.html')
        else:
            error_message = 'Link expired please request a new one.'
            return render_template('forgotpassword.html',
                                   error=error_message)


@app.route('/user_settings', methods=["GET", "POST"])
def user_settings():
    if not session.get('beta'):
        return "access denied :("

    if 'user_id' not in session:
        return redirect(url_for('login'))

    return render_template('user_settings.html')


@app.route('/confirmCart', methods=["POST", "GET"])
def confirmCart():
    if not session.get('beta'):
        return "access denied :("

    if 'order_in_queue' in session:
        session.pop('order_in_queue')
    return render_template("confirmCart.html")


@app.route('/order_placed/', methods=["POST", "GET"])
def order_placed():
    if not session.get('beta'):
        return "access denied :("
    confirmation_code = session.get("order_code")

    if not confirmation_code:
        return redirect(url_for('user_orders'))

    kwargs = {"confirmation_code": confirmation_code}
    order = Controllers.connect_to_db(Controllers.get_order_for_code, kwargs)
    if not order:
        error_message = "Something went wrong. Could not retrieve order."
        return render_template('order_placed.html',
                               error=error_message)
    order = order.get('return_value')
    print(order)
    total = order.pop("price")
    paid = order.pop("paid")
    comments = order.pop("comments")
    return render_template('order_placed.html', order=order,
                           total=total, paid=paid, comments=comments)


@app.route('/charge', methods=["POST"])
def charge():
    if not session.get('beta'):
        return "access denied :("

    if 'user_id' not in session and 'confirmation_code' not in session:
        return jsonify({'error': 'must log in or continue as guest'})
    # if user is logged in get user_id else set to False
    user_id = session.get('user_id') if 'user_id' in session else False
    # there will be confirmation code in session if the user requested guest
    # login, else generate new code.
    confirmation_code = session.get("confirmation_code")
    if not confirmation_code:
        confirmation_code = Controllers.generate_confirmation_code()

    order_information = {
        '_id': confirmation_code,
        'name': request.form.get('name'),
        'date': request.form.get('date'),
        'phone': request.form.get('phone'),
        'email': request.form.get('email'),
        'address': request.form.get('address'),
        'order': request.form.get('order'),
        'comments': request.form.get('notes')}

    validate_phone = phonenumbers.parse("+1" +
                                        order_information.get('phone'), "US")

    if not phonenumbers.is_valid_number(validate_phone):
        return jsonify({"error": "Given phone number is not valid"})

    billing_address = json.loads(request.form.get("billing"))

    if None in order_information.values():
        return jsonify({'error': 'Some information missing from order'})

    current_prices = Controllers.connect_to_db(Controllers.parse_menu_prices)
    if current_prices.get("status"):
        current_prices = current_prices.get("return_value")
    else:
        error_message = "there was a problem verifying your cart total."
        return jsonify({"error": error_message})

    (order_information["price"], order_information['order']) = Controllers.validate_order(
        order_information['order'], current_prices)

    if not order_information.get('price') or not order_information.get('order'):
        return jsonify({'error': 'could not confirm order pricing'})

    recipient_email = request.form.get('email')
    is_valid_email = parseaddr(recipient_email)
    if not is_valid_email[0] == '' and is_valid_email[1] == '':
        return jsonify({'error': "Email address not valid."})

    stripe.api_key = settings.get("STRIPE_KEY")
    token = request.form['stripeToken']

    try:
        charge = stripe.Charge.create(
            amount=Controllers.format_amount_to_cents(
                order_information['price']),
            currency='usd',
            description='Charge for :{}'.format(confirmation_code),
            receipt_email=recipient_email,
            statement_descriptor="order code: {}".format(confirmation_code),
            metadata={
                'address': billing_address.get('street') +
                        " " + billing_address.get("city")
            },
            source=token)

        amount_charged = charge.get("amount", "Charge was not processed")
        didPay = charge.get('paid')
        if not didPay:
            return jsonify({"error": "charge could not be complete"})

        order_information['paid'] = "$" + \
            str(amount_charged)[:-2] + "." + str(amount_charged)[-2:]

        kwargs = {'date': order_information.get("date"),
                  'order_total': order_information.get("price")}
        Controllers.connect_to_db(Controllers.reconcile_managedates, kwargs)
        if user_id:
            confirmation_code_to_user_kwargs = {'user_id': user_id,
                                                'confirmation_code':
                                                confirmation_code}
            Controllers.connect_to_db(
                Controllers.add_confirmation_code_to_user,
                confirmation_code_to_user_kwargs)

        add_order_to_db_kwargs = {'order': order_information}
        Controllers.connect_to_db(Controllers.add_order_to_db,
                                  add_order_to_db_kwargs)
        # email placed order to user.
        Email_Service.placed_order_email(recipient_email,
                                         order_information,
                                         confirmation_code)

        session['order_code'] = order_information['_id']
        return jsonify({'success': 'success'})

    except stripe.error.CardError as e:
        body = e.json_body
        err = body.get('error', {})
        print("Status is: %s" % e.http_status)
        print("Type is: %s" % err.get('type'))
        print("Code is: %s" % err.get('code'))
        # param is '' in this case
        print("Param is: %s" % err.get('param'))
        print("Message is: %s" % err.get('message'))

    except stripe.error.RateLimitError as e:
        traceback.print_exc()
        # Too many requests made to the API too quickly
        error_message = ' Too many requests made to API too quickly'
        Controllers.log_error(str(e) + error_message)
        error_message = """ Our servers are currently
                        over used please try again later."""
        return jsonify({'error': error_message})

    except stripe.error.InvalidRequestError as e:
        traceback.print_exc()
        # Invalid parameters were supplied to Stripe's API
        error_message = ' Invalid parameters were passed to Stripe API'
        Controllers.log_error(str(e) + error_message)
        error_message = """There was a problem processing
                         your payment, no charge was made."""
        return jsonify({'error': error_message})

    except stripe.error.AuthenticationError as e:
        traceback.print_exc()
        # Authentication with Stripe's API failed
        # (maybe you changed API keys recently)
        error_message = ' Stripe API athentication failed, check API keys'
        Controllers.log_error(str(e) + error_message)
        return jsonify({'error': "Stripe authentication failed."})

    except stripe.error.APIConnectionError as e:
        traceback.print_exc()
        # Network communication with Stripe failed
        error_message = 'Network Communication error, no charge was made.'
        Controllers.log_error(str(e) + error_message)
        return jsonify({'error': error_message})

    except stripe.error.StripeError as e:
        traceback.print_exc()
        # Display a very generic error to the user, and maybe send
        # yourself an email
        error_message = ("There was a problem processing the payment,"
                         " no charge was made.")
        Controllers.log_error(str(e) + error_message)
        return jsonify({'error': error_message})

    except Exception as e:
        traceback.print_exc()
        # Something else happened, completely unrelated to Stripe
        error_message = """ There was a payment processing
                         error unrelated to Stripe"""
        Controllers.log_error(str(e) + error_message)
        error_message_user = ('There was a problem processing ' +
                              'your payment, no charge was made.')
        return jsonify({'error': error_message})


@app.route("/disabled_dates", methods=["GET"])
def disabled_dates():
    (disabled_dates, max_amount_per_day) = Controllers.get_disabled_dates()
    return jsonify(disabled_dates)


@app.route('/change_contact_info/', methods=["POST"])
def change_contact_info():
    if not session.get('beta'):
        return "access denied :("

    if 'user_id' not in session and 'guest_code' not in session:
        return jsonify({'error': 'failed'})

    to_update_obj = {}
    confirmation_code = request.form.get('confirmation_code')
    for key, value in request.form.items():
        if not value and key != "Comments":
            return jsonify({'error': 'missing arguments'})
        to_update_obj[key.lower()] = value

    kwargs = {"confirmation_code": confirmation_code,
              "update_dict": to_update_obj}
    Controllers.connect_to_db(Controllers.update_contact_info, kwargs)

    return jsonify({'success': "Contact Set!"})


@app.route("/set_edit_order_num/", methods=["POST"])
def set_edit_order_num():
    confirm_code = request.form.get("confirmation_code")
    session["confirmation_code"] = confirm_code
    return jsonify({"Success": "Confirmation code set."})


@app.route('/edit_order', methods=["POST", "GET"])
def edit_order():
    if not session.get('beta'):
        return "access denied :("

    if 'user_id' not in session:
        return redirect(url_for('login'))

    confirmation_code = session.get("confirmation_code")
    if not confirmation_code:
        return redirect(url_for("user_orders"))
    user_id = session.get("user_id")

    confirmation_code_matches_user = Controllers.validate_user_placed_confirmation_code(
        user_id, confirmation_code)

    if not confirmation_code_matches_user:
        print("code did not match user: " + user_id)
        return redirect(url_for("user_orders"))

    kwargs = {'confirmation_code': confirmation_code}
    order_to_edit = Controllers.connect_to_db(
        Controllers.get_order_for_code, kwargs)

    if not order_to_edit.get("status"):
        return redirect(url_for('user_orders'))
    order_to_edit = order_to_edit.get("return_value")
    session['order_to_edit'] = order_to_edit
    menu = Controllers.connect_to_db(Controllers.get_menu_items)
    if menu.get("status") and menu.get("return_value"):
        menu = menu.get("return_value")
    else:
        return render_template("error_page.html")
    # if we could not retrieve the menu, then the page
    # cannot be used. Show only error page.
    return render_template('edit_order.html', order=order_to_edit, menu=menu)


@app.route("/get_order/prices/menu/", methods=["GET"])
def get_order_prices_menu():
    if 'order_to_edit' not in session:
        return jsonify({"error": "No order to edit found in session."})
    order_to_edit = session.pop('order_to_edit')
    menu = Controllers.connect_to_db(Controllers.get_menu_items)
    if not menu.get("status") or not menu.get("return_value"):
        return jsonify({"error": "Failed retrieving menu."})
    menu = menu.get("return_value")
    prices = Controllers.connect_to_db(Controllers.parse_menu_prices)
    if not prices.get("status") or not prices.get("return_value"):
        return jsonify({"error": prices.get("error")})
    return jsonify({'order': order_to_edit,
                    'menu': menu,
                    'prices': prices.get("return_value")})


@app.route('/commit_order_edit/', methods=["POST"])
def commit_edit():
    if not session.get('beta'):
        return "access denied :("

    new_order = request.form.get('order')
    current_prices = Controllers.connect_to_db(Controllers.parse_menu_prices)
    confirmation_code = session.get("confirmation_code")
    if not confirmation_code:
        return jsonify({'error': 'Could not get confirmation code for order.'})

    kwargs = {'confirmation_code': confirmation_code}
    order_information = Controllers.connect_to_db(
        Controllers.get_order_for_code, kwargs).get("return_value")

    kwargs = {'order_info': order_information}
    Controllers.connect_to_db(Controllers.log_old_order, kwargs)
    if not current_prices.get("status"):
        return jsonify({"error": "Could not verify your new total."})
    current_prices = current_prices.get("return_value")
    (order_information["price"], order_information['order']
     ) = Controllers.validate_order(new_order, current_prices)

    if not order_information.get('price') or not order_information.get('order'):
        return jsonify({'error': 'could not confirm order pricing'})

    confirmation_code = order_information.pop("_id")
    if order_information.get("confirmation_code"):
        order_information.pop("confirmation_code")
    kwargs = {"id": confirmation_code, "new_order": order_information}
    Controllers.connect_to_db(Controllers.update_order, kwargs)
    return jsonify({'success': 'success'})


@app.route('/guest_login/', methods=["GET"])
def guest_login():
    if not session.get('beta'):
        return "access denied :("
    if 'user_id' in session:
        return jsonify({'error': 'already logged in'})
    if 'guest_code' in session:
        session.pop('guest_code')

    guest_code = Controllers.generate_confirmation_code()
    session['confirmation_code'] = guest_code

    return jsonify({'code': guest_code})


@app.route('/request_login/', methods=["POST"])
def request_login():
    if not session.get('beta'):
        return "access denied :("
    username_or_email = request.form.get('username', '')
    password = request.form.get('pass', '')

    if username_or_email == '' or password == '':
        return jsonify({'error': 'Username or password not provided'})

    kwargs = {'username_or_email': username_or_email, "password": password}
    verify_user = Controllers.connect_to_db(Controllers.login_user, kwargs)

    if not verify_user.get('status') or not verify_user.get("return_value"):
        return jsonify({'error': "could not confirm username or password"})

    session["user_id"] = verify_user.get("return_value")
    session["user_name"] = username_or_email

    return jsonify({'username': username_or_email,
                    'id': verify_user.get("return_value")})


@app.route('/request_register/', methods=["GET"])
def request_register():
    if not session.get('beta'):
        return "access denied :("
    username = request.form.get("username")
    email = request.form.get("email")
    password = request.form.get("pass")

    if not Controllers.is_valid_password(password):
        return jsonify({'pass_error': 'could not validate password'})
    is_valid_email = parseaddr(email)
    if not is_valid_email[0] == '' and is_valid_email[1] == '':
        return jsonify({'error': "Email address not valid."})

    kwargs = {'username': username, "email": email, "password": password}
    register_user = Controllers.connect_to_db(
        Controllers.register_user, kwargs)

    if not register_user.get('status'):
        error_message = "Something went wrong attempting to register"
        return jsonfiy({'error': error_message})

    register_user = register_user.get('return_value')

    if hasattr(register_user, 'error'):
        return jsonify({'error': register_user.get("error")})

    # send thank you for registering email.
    response = Email_Service.thank_for_sign_up(email, username)
    session["user_id"] = register_user.get("_id")
    session["user_name"] = username

    if username == 'admin':
        session['admin'] = True
    return jsonify({'username': username, 'id':  register_user.get("_id")})


@app.route('/login', methods=["GET", "POST"])
def login():
    if not session.get('beta'):
        return "access denied :("
    beta_key = session.get('beta')
    session.clear()
    session['beta'] = beta_key
    if request.method == "POST":

        if not request.form.get("username"):
            return render_template("login.html",
                                   error="Please enter a username")

        if not request.form.get("password"):
            return render_template("login.html", error="Must provide Password")

        username = request.form.get("username")
        provided_pass = request.form.get("password")

        kwargs = {'username_or_email': username, 'password': provided_pass}
        verify_user = Controllers.connect_to_db(Controllers.login_user, kwargs)

        if not verify_user.get("status") or not verify_user.get("return_value"):
            return render_template('login.html',
                                   error="Invalid username or email/password.")

        session["user_id"] = verify_user.get("return_value")
        session["user_name"] = username
        if username == 'admin':
            session['admin'] = True
            return redirect(url_for("scheduled_orders"))

        return redirect(url_for("index"))

    return render_template("login.html")


@app.route('/logout', methods=["GET", "POST"])
def logout():
    if not session.get('beta'):
        return "access denied :("
    beta_key = session.get('beta')
    session.clear()
    session['beta'] = beta_key
    return redirect(url_for("index"))


@app.route('/register', methods=["GET", "POST"])
def register():
    if not session.get('beta'):
        return "access denied :("

    beta_key = session.get('beta')
    session.clear()
    session['beta'] = beta_key
    if request.method == "POST":

        # check that all information has been provided
        is_valid_form = Controllers.validate_form(request.form)

        if not is_valid_form.get('return_valid').get("is_valid"):
            error_message = is_valid_form.get('return_valid').get('message')
            return render_template('register.html', error=error_message)
        password = request.form.get("password")
        # validate password meets conditions
        if not Controllers.is_valid_password(passowrd):
            return render_template('register.html',
                                   error='could not validate password')

        username = request.form.get("username")
        email = request.form.get("email")
        is_valid_email = validate_email(email, verify=True)
        if not is_valid_email:
            return jsonify({'error': "Email address not valid."})
        # check to see if username has already been added to database
        kwargs = {'username': username, "email": email, "password": password}
        registered_user = Controllers.connect_to_db(
            Controllers.register_user, kwargs)

        if not registered_user.get('status'):
            return render_template('register.html',
                                   error="Something went wrong.")
        registered_user = registered_user.get('return_value')

        if hasattr(registered_user, 'error'):
            return render_template("register.html",
                                   error=registered_user.get('error'))

        # send thank you for sign up email
        Email_Service.thank_for_sign_up(email, username)
        session["user_id"] = registered_user.get("_id")
        session["user_name"] = registered_user.get("username")

        if registered_user.get("return_value").get("username") == 'admin':
            session['admin'] = True
            return redirect(url_for("managedates"))
        return redirect(url_for("index"))

    return render_template('register.html')


@app.route('/managedates', methods=["GET", "POST"])
def managedates():
    if not session.get('beta'):
        return "access denied :("

    # validate that user is logged in and is admin
    if "user_id" not in session:
        return redirect(url_for('login'))

    if "admin" not in session:
        return redirect(url_for('login'))

    (all_dates, max_val) = Controllers.get_disabled_dates(True)
    sorted_dates = Controllers.sort_list_of_dates(all_dates)

    if request.method == "POST":
        data = request.form.get("data")
        kwargs = {'dates': data.split("/")}

        if data[0] != '':

            if 'disable' in request.form:
                Controllers.connect_to_db(Controllers.disable_dates, kwargs)

            if 'enable' in request.form:
                Controllers.connect_to_db(Controllers.enable_dates, kwargs)

        return redirect(url_for("managedates"))

    return render_template("managedates.html",
                           admin=True,
                           maximum=max_val,
                           sorted_dates=sorted_dates)


@app.route('/menusetter', methods=["GET", "POST"])
def menusetter():
    if not session.get('beta'):
        return "access denied :("
    if "user_id" not in session:
        return redirect(url_for('login'))
    if "admin" not in session:
        return redirect(url_for('login'))

    return render_template("menusetter.html", admin=True)


@app.route('/scheduled_orders', methods=["GET", "POST"])
def scheduled_orders():
    if not session.get('beta'):
        return "access denied :("
    if "user_id" not in session:
        return redirect(url_for('login'))

    if "admin" not in session:
        return redirect(url_for('login'))

    all_orders = Controllers.connect_to_db(Controllers.get_all_orders)

    if all_orders.get("status"):
        all_orders = all_orders.get("return_value")

    (past_dates, upcoming_dates, errors) = Controllers.split_list_of_orders(all_orders)

    past_dates_sorted = Controllers.sort_list_of_dates(
        past_dates, "date", True)
    upcoming_dates_sorted = Controllers.sort_list_of_dates(
        upcoming_dates, "date")

    return render_template('scheduled_orders.html',
                           admin=True,
                           upcoming_orders=upcoming_dates_sorted,
                           past_orders=past_dates_sorted)


@app.route('/commit_special_note/', methods=["POST"])
def commit_note():
    if not session.get('beta'):
        return "access denied :("

    orderId = request.form.get('orderId')
    special_note = request.form.get('note')

    if not orderId or special_note is None:
        return jsonify({'error': 'Something went wrong!'})

    kwargs = {'orderId': orderId, "note": special_note}
    Controllers.connect_to_db(Controllers.set_order_special_note, kwargs)

    return jsonify({'succes': ''})


@app.route('/get_prices/', methods=["GET"])
def get_prices():
    if not session.get('beta'):
        return "access denied :("
    prices = Controllers.connect_to_db(Controllers.parse_menu_prices)
    if prices.get("status") and prices.get("return_value"):
        return jsonify(prices.get("return_value"))
    return jsonify({"Error": prices.get("error")})


@app.route('/_get_menu')
def get_menu():
    if not session.get('beta'):
        return "access denied :("
    menu = Controllers.connect_to_db(Controllers.get_menu_items)
    print(menu)
    if menu.get("status") and menu.get('return_value'):
        return jsonify({'Status': "Success", 'Menu': menu.get('return_value')})
    return jsonify({"Status": "Failed"})


@app.route('/update_menu/', methods=["POST"])
def update_menu():
    result = Sheets_Service.read_menu()
    if type(result) != type(['list']):
        if hasattr(result, "Error"):
            return jsonify({"Status": "Failed",
                            "Message": result.get("Error")})
        error_message = "Something went wrong reading google sheets."
        return jsonify({"Status": "Failed",
                        "Message": error_message})
    kwargs = {'list_of_menu': result}
    Controllers.connect_to_db(Controllers.update_menu_to_db, kwargs)
    return jsonify({"Status": "Success", "Message": "Menu updated."})


@app.route('/favicon.ico')
def favicon():
    return send_from_directory(os.path.join(app.root_path, 'static'),
                               'favicon.ico', mimetype='image/png')


def shutdown_server():
    func = request.environ.get('werkzeug.server.shutdown')
    if func is None:
        raise RuntimeError('Not running with the Werkzeug Server')
    func()


@app.route("/error", methods=["GET", "POST"])
def error():
    return render_template("error.html")


@app.route('/privacy_policy', methods=["GET"])
def privacy_policy():
    if not session.get('beta'):
        return "access denied :("
    return render_template("privacypolicy.html")


@app.route('/terms_and_conditions', methods=["GET"])
def terms_and_conditions():
    if not session.get('beta'):
        return "access denied :("
    return render_template('terms_and_conditions.html')


if __name__ == '__main__':

    app.debug = True
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port)
