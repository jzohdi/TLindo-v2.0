# -*- coding: utf-8 -*-
"""
Created on Thu Nov  8 16:12:38 2018

@author: jakez
"""
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

###################################################################################

def log_exception(message):
    with open('error_log.txt', 'a+') as file:
        file.write(message + ' ' + str(datetime.datetime.now()) + '\n')
        file.close()

def validate_date(date_string):
    try:
        key = datetime.datetime.strptime(date_string, '%d %B, %Y')
        return key
    except:
        return False

def parse_order_to_list(foodCounter):
    total = foodCounter.pop('total')
    new_list = []
    for key in foodCounter:
        if 'items' in foodCounter[key]:
            parsed_list = parse_items_resolution(foodCounter.get(key).get('items'))
            for item in parsed_list:
                new_list.append(item)
    return (new_list, total)

def get_else_exception(dictionary, key, fallback = False ):
    if key in dictionary:
        return dictionary[key]
    elif fallback:
        if fallback in dictionary:
            return dictionary[fallback]
        else:
            raise Exception(key + " not found")

def get_price_for_flavor(price_dict, name, flavor):
    if name in price_dict:
        flavor_prices = price_dict[name]
        if flavor in flavor_prices:
            return flavor_prices[flavor]
        elif 'default' in flavor_prices:
            return flavor_prices['default']
        else:
            raise Exception("flavor pricing not found")
    else:
        raise Exception("flavor not found in pricing")

def get_item_cost(order_item, current_prices):
#    item_total = 0
    item_name = get_else_exception(order_item, 'name')

    if item_name == 'Side Choices':
        item_name = get_else_exception(order_item, 'side')
        sizing = get_else_exception(order_item, 'size', 'portion')
    #    sizing = sizing.replace(" ", '')
        sizing = sizing.strip()
        item_count = get_else_exception(order_item, 'count')
        count_x_size = SIZE_RULES.get(sizing, 1) * item_count

        return count_x_size * current_prices.get(item_name).get('default')

    else:
        item_flavor = get_else_exception(order_item, 'flavor')

        initial_count = get_else_exception(DEFAULT_COUNT, item_name)

        multiplied_by_count = initial_count * get_else_exception(order_item, 'count')

        sizing = get_else_exception(order_item, 'size', 'portion')

    #    sizing = sizing.replace(" ", '')
        sizing = sizing.strip()
    #    print(sizing)
        multiplied_by_portion_size = multiplied_by_count * SIZE_RULES.get(sizing, 1)
        print(multiplied_by_portion_size)
        print('6')
        return multiplied_by_portion_size * get_price_for_flavor(current_prices, item_name, item_flavor)


def confirm_order_price(order_string, current_prices):
#    print(order_string)

    order_total = 0
    if type(order_string) == type("string"):
        user_order = json.loads(order_string)
    else:
        user_order = order_string
    (all_order_items, total) = parse_order_to_list(user_order)

    order_items_list = []

    for order_item in all_order_items:
        try :
#            print(order_item, current_prices)
            item_cost = get_item_cost(order_item, current_prices)
#            print(item_cost)
            order_item["cost"] = item_cost
            order_items_list.append(order_item)
            order_total += item_cost
        except Exception as error:
            log_exception(str(error) + " Exception in confirm_order_price.")
            return False
#    print(order_total, "  ", order_items_list)
    return (round(order_total, 2), order_items_list )


def parse_menu_for_prices(raw_menu):
    new_object = {}
    for item in raw_menu:
#        print(item)
        if 'price' in item:
            item_prices = item.pop("price").split(",")
            prices_dict = {}
            for item_price in item_prices:
                if "=" in item_price:
                    price_tolist = item_price.split("=")
                    prices_dict[price_tolist[0]] = float(price_tolist[1])
            new_object[item.get('item')] = prices_dict
    return new_object

def add_sides_prices(all_prices_dict, sides_menu):

    for item in sides_menu:
        if 'categories' in item:
            continue
        if 'price' or 'prices' in item:
            price_or_prices = 'price' if 'price' in item else 'prices'
            try:
                item_prices = item.pop(price_or_prices).split(',')
                price_dict = {}
                for item_price in item_prices:
                    if '=' in item_price:
                        price_tolist = item_price.split('=')
                        price_dict[price_tolist[0]] = float(price_tolist[1])
                all_prices_dict[item.get('item')] = price_dict
            except Exception:
                pass
    return all_prices_dict

def get_categories( l_of_d ):
  for x in range( len( l_of_d ) ):
    if l_of_d[x].get('categories') != None:
        titles = l_of_d[x].get('categories')
        del l_of_d[x]
        return titles

def return_sheet( list_of_dictionaries ):
    titles = get_categories( list_of_dictionaries )
    all_items = []
    all_items.append(titles)
    for each_item in list_of_dictionaries:
        item = []
        for title in titles:
            item.append( each_item.get(title.lower() ) )
        all_items.append( item )
    return all_items

def save_xls( menu, filename ):

    menu = menu[-1]
    entrees = json.loads(menu.get('entree'))
    sides = json.loads(menu.get('sides'))

    wb = Workbook()

    sheet1 = wb.add_sheet('Entrees')

    all_entrees = return_sheet( entrees )
    for index, item in enumerate(all_entrees):
        for item_index, variable in enumerate( item ):
            sheet1.write(index, item_index, variable)

    sheet2 = wb.add_sheet('Sides')

    all_sides = return_sheet( sides )
    for index, item in enumerate( all_sides ):
        for item_index, variable in enumerate( item ):
            sheet2.write(index, item_index, variable)
    try:
        os.remove(filename)
    except Exception:
        pass
    wb.save(filename)

def get_listOfItems_fromExcel(wb, index):
    sheet = wb.sheet_by_index(index)
    n_rows = sheet.nrows
    n_cols = sheet.ncols
    titles = [sheet.cell_value(0, x) for x in range(n_cols)]
    all_items = []
    for row in range(1, n_rows):
        new_item = {}
        for col in range(n_cols):
            title = titles[col].lower()
            cell_value = sheet.cell_value(row, col)
            new_item[title] = cell_value
        all_items.append(new_item)
    cat_obj = {'categories' : titles}
    all_items.append(cat_obj)

    return all_items

def getOrder_and_checkIfValidDate(list_of_orders, num):
    orders_list = json.loads(list_of_orders)

    for each_order in orders_list:
        each_order_num = each_order.get('order_num')

        if each_order_num == num or each_order_num == int(num):
            order_date = each_order.get('date')
            is_valid_date = validate_date(order_date)

            if is_valid_date:
                is_date_furtherThan_24hr = (datetime.datetime.today() + datetime.timedelta(days=1) < is_valid_date)

                if is_date_furtherThan_24hr:
                    return each_order.get('order')
    return None

def set_order_edit(list_of_orders, order_num, order_total, order):

    order_list = json.loads(list_of_orders)
    initial_length = len(order_list)

    for index, each_order in enumerate(order_list):

         if each_order.get('order_num') == int(order_num):
            each_order['order'] = order
            each_order['price'] = order_total
         order_list[index] = each_order

    if initial_length == len(order_list):
        return order_list
    else:
        return False

def parse_resolution(single_item):
    num = single_item.get('count')
    if single_item.get("name") in MIN_RES_RULES:
        num *= MIN_RES_RULES.get(single_item.get('name') )
    new_list = []
    if num == 1:
#        print('here ', single_item)
        single_item['size'] = 'Shallow Half Pan'
        new_list.append(single_item)
    else:

        (num_full_pan, num) = (int(num / 4), num % 4)

        if num_full_pan > 0:
            full_pan = deep_copy(single_item)
            full_pan['count'] = num_full_pan
            full_pan['size'] = 'Full Pan'
            new_list.append(full_pan)

        (num_half_pan, num) = (int(num / 2), num % 2)

        if num_half_pan > 0:
            half_pan = deep_copy(single_item)
            half_pan['count'] = num_half_pan
            half_pan['size'] = 'Half Pan'
            new_list.append(half_pan)

        if num > 0:
            single_item['count'] = num
            single_item['size'] = 'Shallow Half Pan'
            new_list.append(single_item)

    return new_list

def parse_items_resolution(list_of_item_dicts):
#    print(list_of_item_dicts)
    return_list = []
#    print(list_of_item_dicts)
    for item in list_of_item_dicts:
#        print(item)
        portion = item.pop('portion', False)
        if not portion:
            return_list.append(item)
        elif 'count' not in portion:
            return_list.append(item)
        else:
            maximized_resolution = parse_resolution(item)
#            print(maximized_resolution)
            for new_item in maximized_resolution:
                return_list.append(new_item)
    return return_list

"""
###############################################################################
###################### END OF HELPER FUNCTIONS ################################
###############################################################################
"""


MENU_VERSION = '1'
MIN_RES_RULES = {'Rotisserie Chicken': 2, "Nacho Bar" : 2}
DEFAULT_COUNT = { 'Taco Tray' : 24, 'Burrito Tray' : 8, "Nacho Bar" : 5, "Rotisserie Chicken" : 5 }
SIZE_RULES = {'Half Pan' : 2, 'Full Pan' : 4, '48 oz Container' : 1.5}

def commit_settings(params):
    new_obj = {}
    if params:
        for_connection = ["HOST", "DB", "PW", "USER", "PORT"]
        for connection in for_connection:
            new_obj[connection] = params[connection]
        return (new_obj, params)
    else:
        environment = ['BETA_KEY', 'DATABASE_URL', 'DB', 'EMAIL_ADDRESS', 'HOST',
                'PASSWORD', 'PORT', 'PW', 'SHUTDOWN', 'STRIPE_KEY', 'USER', 'SECRET_KEY']
        for variable in environment:
            new_obj[variable] = os.environ.get(variable)
        return new_obj

params = getKeys()

(params, settings) = commit_settings(params)

Controllers = App_Actions(settings, **App_Actions_dependencies)
Email_Service = Email_Service(settings, **Email_Service_dependencies)
Sheets_Service = GSpread(**GSpread_dependencies)

settings['SECRET_KEY'] = os.environ.get('SECRET_KEY', Controllers.get_salt(25))

def execute(statement, values = ("NA",), close = True):
    conn = False
    cur = False
    res = None
    try:
        conn = psycopg2.connect(**params)
    except:
        print("unable to connect")

    try:
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        if "SELECT" in statement:
            if "%s" not in statement:
                cur.execute(statement)
                res = [json.loads(json.dumps(dict(record))) for record in cur]
            else:
                cur.execute( statement, values )
            #conn.commit()
                res = [json.loads(json.dumps(dict(record))) for record in cur]
            #print(res)
        if "INSERT" in statement or "UPDATE" in statement:
            cur.execute( statement, values )
            conn.commit()
            res = cur.statusmessage
        return res
    except Exception as error:
        print("database action failed" + str(error))
        log_exception("database action failed" + str(error))
    finally:
        if close:
            if conn:
                if cur:
                    cur.close()
                conn.close()
    return res

def config():
    db = {'host': settings.get('HOST', None),
        'db' : settings.get('DB', None),
        'user' : settings.get('USER', None),
        'port' : settings.get('PORT', None),
        'pw' : settings.get('PW', None)
        }

    return db

POSTGRES = config()
params = {
                'host' : POSTGRES['host'],
                'dbname' : POSTGRES['db'],
                'user' : POSTGRES['user'],
                'password' : POSTGRES['pw']
                    }

app = Flask(__name__)
PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(PROJECT_ROOT, 'static')
app.static_path=STATIC_ROOT
#app.static_folder = 'static'

jsglue = JSGlue(app)

app.jinja_env.add_extension('jinja2.ext.loopcontrols')
#app.config["SESSION_FILE_DIR"] = mkdtemp()
app.config["SESSION_PERMANENT"] = False
app.config["SESSION_TYPE"] = "filesystem"
app.config['TEMPLATES_AUTO_RELOAD'] = True

app.config.update({
    'SECRET_KEY': os.environ.get('SECRET_KEY', settings.get('SECRET_KEY'))
})
#app.secret_key = secret_Key

app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'postgresql://%(user)s:\
%(pw)s@%(host)s:%(port)s/%(db)s' % POSTGRES)

app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

if app.config["DEBUG"]:
    @app.after_request
    def after_request(response):
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
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
    kwargs = {'user_id' : user_key}
    all_orders = Controllers.connect_to_db(Controllers.get_user_orders, kwargs)

    if all_orders.get('status'):

        all_orders = all_orders.get("return_value")
        (past_dates, upcoming_dates, errors) = Controllers.split_list_of_orders(all_orders, True)

        past_dates_sorted = Controllers.sort_list_of_dates(past_dates, "date", True)
        upcoming_dates_sorted = Controllers.sort_list_of_dates(upcoming_dates, "date")

        return render_template('userorders.html', admin=False, upcoming_orders = upcoming_dates_sorted, past_orders = past_dates_sorted)
    else:
        return redirect(url_for('logout'))

@app.route('/orderlookup', methods=["GET", "POST"])
def orderlookup():
    if not session.get('beta'):
        return "access denied :("
    if request.method == "POST":
#        print('here')
        confirmation_code = request.form.get("confirmationCode")
        if len(confirmation_code) < 5:
            return render_template('orderlookup.html', error="Invalid Code")
        kwargs = {"confirmation_code" : confirmation_code}
        user_order = Controllers.connect_to_db(Controllers.get_order_for_code, kwargs)
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
        return redirect( url_for('login'))

    old_password = request.form.get('current-password')
    new_password = request.form.get('new-password')
    confirm_new_password = request.form.get('confirm-new-passowrd')

    unique = session.get('user_id')

    if not old_password or not new_password or not confirm_new_password:
        return render_template('user_settings.html', error='Could not validate password')
    if new_password != confirm_new_password:
        return render_template('user_settings.html', error='Passwords do not match')
    if not Controllers.is_valid_password(new_password):
        return render_template('user_settings.html', error='Could not validate password' )
    
    kwargs = {"user_id" : unique, "new_pass" : new_password, 'old_pass' : old_password}
    change_pass_result = Controllers.connect_to_db(Controllers.change_user_pass, kwargs)
    
    if not change_pass_result.get('status') or not change_pass_result.get('return_value'):
        return render_template("user_settings.html", error="Password could not be changed")

    return render_template('user_settings.html', error='New password set!')

@app.route('/forgotpassword', methods=["POST", "GET"])
def forgotpassword():
    if not session.get('beta'):
        return "access denied :("

    if request.method == "POST":

        email = request.form.get('email')
#        print(email)
        if not email:
            return render_template('Please provide email for a recovery link')
        kwargs = {"email" : email}
        does_user_exist = Controllers.connect_to_db(Controllers.user_exists, kwargs)

        if not does_user_exist.get("status"):
            return render_template("forgotpassword.html", error="Something went wrong finding email in our records.\n Please give us a call.")
        if not does_user_exist.get("return_value"):
            return render_template('forgotpassword.html', error="Could not find email in records")
        # generate reset password link and associated code
        (set_new_pass_link, code) = Controllers.get_new_pass_link(email)
        # add email and confirmation code to database with timestap
        kwargs = {'email' : email, 'code' : code}
        Controllers.connect_to_db(Controllers.add_pass_recovery, kwargs)
        # start thread to send email as sending may take a minute if server is asleep.
        thread_one = Thread(target = Email_Service.send_password_recovery, args=(email, set_new_pass_link), daemon=True)
        thread_one.start()

        return render_template('forgotpassword.html', error="Resent link sent! Valid for 24 hours, make sure to check spam folder.\n If you do not recieve an email soon, please give us a call.")
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
            return render_template('password_recovery.html', error = 'One or more fields were empty, or passwords did not match.')

        if not Controllers.is_valid_password(new_password):
            return render_template('password_recovery.html', error = 'New password does not meet password requirements' )
        kwargs = { 'email' : email, "new_pass" : new_password }
        update_password = Controllers.connect_to_db(Controllers.update_user_password, kwargs)
        if not update_password.get("status") or not update_password.get("return_value"):
            return render_template("password_recovery.html", error="Something went wrong updateing user password")

        session['user_id'] = update_password.get('return_value').get("_id")
        session.pop('recovery_code')
        session.pop('recovery_email')
        return redirect( url_for('index') )

    else:
        code = request.args.get('code')
        email = request.args.get('recipient')
        print(email)
        if not code or not email:
            return render_template('forgotpassword.html', error="Could not retrieve new pass code")

        kwargs = {'code' : code, 'email' : email}
        validate_url_credentials = Controllers.connect_to_db(Controllers.check_password_recovery, kwargs)
        if not validate_url_credentials.get("status") or not validate_url_credentials.get("return_value"):
            return render_template('forgotpassword.html', error="Could authenticate email, please request a new link")

        original_timestamp = validate_url_credentials.get("return_value")

        is_less_than24hours = Controllers.is_timestamp_within_24hr(original_timestamp)
        
        if is_less_than24hours:
            session['recovery_code'] = code
            session['recovery_email'] = email
            return render_template('password_recovery.html')
        else:
            return render_template('forgotpassword.html', error='Link expired please request a new one.')

@app.route('/user_settings', methods=["GET", "POST"])
def user_settings():
    if not session.get('beta'):
        return "access denied :("

    if 'user_id' not in session:
        return redirect( url_for('login') )

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
        return render_template('order_placed.html', error="Something went wrong. Could not retrieve order.")
    order = order.get('return_value')
    print(order)
    total = order.pop("price")
    paid = order.pop("paid")
    comments = order.pop("comments")
    return render_template('order_placed.html', order=order, total=total, paid = paid, comments=comments)

def format_order_message( order_info ):
    to_return = ''
    for key, value in order_info.items():
        if key != 'id' and key != 'order_num':
            to_return += str(key).capitalize() + ': '+ str(value) + "\n"
    print(to_return)
    return to_return

@app.route('/charge', methods=["POST"])
def charge():
    if not session.get('beta'):
        return "access denied :("

    if 'user_id' not in session and 'confirmation_code' not in session:
        return jsonify({'error' : 'must log in or continue as guest'})
    # if user is logged in get user_id else set to False
    user_id = session.get('user_id') if 'user_id' in session else False
    # there will be confirmation code in session if the user requested guest login, else generate new code.
    confirmation_code = session.get("confirmation_code")
    if not confirmation_code:
        confirmation_code =  Controllers.generate_confirmation_code()

    order_information = { '_id' : confirmation_code,
                         'name' : request.form.get('name'),
                         'date' : request.form.get('date'),
                         'phone' : request.form.get('phone'),
                         'email' : request.form.get('email'),
                         'address' : request.form.get('address'),
                         'order' : request.form.get('order'),
                         'comments' : request.form.get('notes')}

    validate_phone = phonenumbers.parse("+1" + order_information.get('phone'), "US")
    if not phonenumbers.is_valid_number(validate_phone):
        return jsonify({"error": "Given phone number is not valid"})

    billing_address = json.loads( request.form.get("billing") )

    if None in order_information.values():
        return jsonify({'error' : 'Some information missing from order'})

    current_prices = Controllers.connect_to_db(Controllers.parse_menu_prices)
    if current_prices.get("status"):
        current_prices = current_prices.get("return_value")
    else:
        return jsonify({"error" : "there was a problem verifying your cart total."})
    # print(current_prices)
    (order_information["price"], order_information['order']) = Controllers.validate_order( order_information['order'], current_prices)
    if not order_information.get('price') or not order_information.get('order'):
        return jsonify({'error' : 'could not confirm order pricing'})

    recipient_email = request.form.get('email')
    is_valid_email = parseaddr(recipient_email)
    if not is_valid_email[0] == '' and is_valid_email[1] == '':
        return jsonify({'error': "Email address not valid."})    
    
    stripe.api_key = settings.get("STRIPE_KEY")
    token = request.form['stripeToken']

    try:
        charge = stripe.Charge.create(
            amount = Controllers.format_amount_to_cents(order_information['price']),
            currency='usd',
            description='Charge for :{}'.format(confirmation_code),
            receipt_email=recipient_email,
            statement_descriptor="order code: {}".format(confirmation_code),
            metadata={
                'address': billing_address.get('street') + " " + billing_address.get("city")
                },
            source=token )

        amount_charged = charge.get("amount", "Charge was not processed")
        didPay = charge.get('paid')
        if not didPay:
            return jsonify({"error" : "charge could not be complete"})
        order_information['paid'] = "$" + str(amount_charged)[:-2] + "."+ str(amount_charged)[-2:]

        kwargs = {'date' : order_information.get("date"), 'order_total' :  order_information.get("price")}
        Controllers.connect_to_db(Controllers.reconcile_managedates, kwargs)
        if user_id:
            confirmation_code_to_user_kwargs = {'user_id' : user_id, 'confirmation_code' : confirmation_code}
            Controllers.connect_to_db( Controllers.add_confirmation_code_to_user, confirmation_code_to_user_kwargs)
        
        add_order_to_db_kwargs = {'order' : order_information }
        Controllers.connect_to_db(Controllers.add_order_to_db, add_order_to_db_kwargs)
        # email placed order to user.
        Email_Service.placed_order_email(recipient_email, order_information, confirmation_code)

        session['order_code'] = order_information['_id']
        return jsonify({'success' : 'success'})

    except stripe.error.CardError as e:
      # Since it's a decline, stripe.error.CardError will be caught
      body = e.json_body
      err  = body.get('error', {})
      print("Status is: %s" % e.http_status)
      print("Type is: %s" % err.get('type'))
      print("Code is: %s" % err.get('code'))
      # param is '' in this case
      print("Param is: %s" % err.get('param'))
      print("Message is: %s" % err.get('message'))

    except stripe.error.RateLimitError as e:
        traceback.print_exc()
        # Too many requests made to the API too quickly
        Controllers.log_error(str(e) + ' Too many requests made to API too quickly')
        return jsonify({'error' : "Our servers are currently over used please try again later."})

    except stripe.error.InvalidRequestError as e:
        traceback.print_exc()
        # Invalid parameters were supplied to Stripe's API
        Controllers.log_error(str(e) + ' Invalid parameters were passed to Stripe API')
        return jsonify({'error' : 'There was a problem processing your payment, no charge was made.'})

    except stripe.error.AuthenticationError as e:
        traceback.print_exc()
        # Authentication with Stripe's API failed
        # (maybe you changed API keys recently)
        Controllers.log_error(str(e) + ' Stripe API athentication failed, check API keys')
        return jsonify({'error' : "Stripe authentication failed."})

    except stripe.error.APIConnectionError as e:
        traceback.print_exc()
        # Network communication with Stripe failed
        Controllers.log_error( str(e) + 'Network Communication error, no charge was made.')
        return jsonify({'error' : 'Network Communication error, no charge was made.'})

    except stripe.error.StripeError as e:
        traceback.print_exc()
        # Display a very generic error to the user, and maybe send
        # yourself an email
        Controllers.log_error( str(e) + "There was a problem processing the payment, no charge was made.")
        return jsonify({'error' : 'There was a problem processing your payment, no charge was made.'})

    except Exception as e:
        traceback.print_exc()
        # Something else happened, completely unrelated to Stripe
        Controllers.log_error(str(e) + ' There was a payment processing error unrelated to Stripe')
        return jsonify({'error' : 'There was a problem processing your payment, no charge was made.'})

def place_order_in_db( user_id, order_to_add ):
    if 'guest_code' in session:
        new_order = json.dumps([order_to_add])
        execute("""
                INSERT INTO allorders (id, orders) VALUES (%s, %s)
                """,(user_id, new_order,))
        return True
    user_has_previous_orders = execute("""
                                   SELECT * FROM allorders WHERE id = %s
                                   """, (user_id, ))
    if len(user_has_previous_orders) > 0:

        loaded_current_orders = json.loads(user_has_previous_orders[0].get('orders'))

        last_order_num = loaded_current_orders[-1].get('order_num')

        order_to_add['order_num'] = order_to_add.get('order_num') + last_order_num
        loaded_current_orders.append(order_to_add)
        order_added_string = json.dumps(loaded_current_orders)

        execute("""
                UPDATE allorders SET orders = %s WHERE id = %s
                """, (order_added_string, user_id,))
    else:
        place_first_order = json.dumps([order_to_add])
        execute("""INSERT INTO allorders (id, orders) VALUES (%s, %s)""",
                (user_id, place_first_order,))
    return True

@app.route("/disabled_dates", methods=["GET"])
def disabled_dates():
    (disabled_dates, max_amount_per_day) = Controllers.get_disabled_dates()
    return jsonify( disabled_dates )

@app.route('/change_contact_info/', methods=["POST"])
def change_contact_info():
    if not session.get('beta'):
        return "access denied :("

    if 'user_id' not in session and 'guest_code' not in session:
        return jsonify({'error': 'failed'})

    # unique_id = str(session.get('user_id')) if 'user_id' in session else session.get('guest_code')
    # if not unique_id:
    #   return jsonify({'error' : "missing arguments"})
    to_update_obj = {}
    confirmation_code = request.form.get('confirmation_code')
    for key, value in request.form.items():
        if not value and key != "Comments":
            return jsonify({'error': 'missing arguments'})
        to_update_obj[key.lower()] = value
    
    kwargs = {"confirmation_code" : confirmation_code, "update_dict" : to_update_obj}
    Controllers.connect_to_db(Controllers.update_contact_info, kwargs)

    return jsonify({'success' : "Contact Set!"})

@app.route("/set_edit_order_num/", methods=["POST"])
def set_edit_order_num():
    confirm_code = request.form.get("confirmation_code")
    session["confirmation_code"] = confirm_code
    return jsonify({"Success" : "Confirmation code set." })

@app.route('/edit_order', methods=["POST", "GET"])
def edit_order():
    if not session.get('beta'):
        return "access denied :("

    if 'user_id' not in session:
        return redirect( url_for('login') )

    confirmation_code = session.get("confirmation_code")
    if not confirmation_code:
        return redirect( url_for("user_orders")
        )
    user_id = session.get("user_id")

    confirmation_code_matches_user = Controllers.validate_user_placed_confirmation_code(user_id, confirmation_code)
    if not confirmation_code_matches_user:
        print("code did not match user: " + user_id)
        return redirect( url_for("user_orders"))
    
    kwargs = {'confirmation_code' : confirmation_code}
    order_to_edit = Controllers.connect_to_db(Controllers.get_order_for_code, kwargs)
   
    if not order_to_edit.get("status"):
        return redirect( url_for('user_orders'))
    order_to_edit = order_to_edit.get("return_value")

    menu = Controllers.connect_to_db(Controllers.get_menu_items)
    if menu.get("status") and menu.get("return_value"):
        menu = menu.get("return_value")           
    else:
        return render_template("error_page.html")
    # if we could not retrieve the menu, then the page cannot be used. Show only error page. 
    return render_template('edit_order.html', order = order_to_edit.get("order"), menu=menu)

@app.route('/commit_order_edit/', methods=["POST"])
def commit_edit():
    if not session.get('beta'):
        return "access denied :("

    order = request.form.get('order')
    current_prices = Controllers.connect_to_db(Controllers.parse_menu_prices)
    (order_total, order) = confirm_order_price(order, current_prices)

    user_id = str(session.get('user_id'))
    order_num = session.pop('edit_order_num')
    orders = execute(""" SELECT orders FROM allorders WHERE id = %s
                     """, (user_id,))

    all_users_orders = orders[0].get('orders')
    all_users_orders_withEdit = set_order_edit(all_users_orders, order_num, order_total, order)

    if all_users_orders_withEdit:
        orders_with_edit = json.dumps(all_users_orders_withEdit)

        execute(""" UPDATE allorders SET orders = %s WHERE id = %s
                """, (orders_with_edit, user_id))

        return jsonify({'error' : 'success'})
    else:
        return jsonify({'error' : 'failed'})

@app.route('/guest_login/', methods=["GET"])
def guest_login():
    if not session.get('beta'):
        return "access denied :("
    if 'user_id' in session:
        return jsonify({'error' : 'already logged in'})
    if 'guest_code' in session:
        session.pop('guest_code')

    guest_code = Controllers.generate_confirmation_code()
    session['confirmation_code'] = guest_code

    return jsonify({'code' : guest_code})

@app.route('/request_login/', methods=["POST"])
def request_login():
    if not session.get('beta'):
        return "access denied :("
    username_or_email = request.form.get('username', '')
    password = request.form.get('pass', '')

    if username_or_email == ''  or password == '':
        return jsonify({'error' : 'Username or password not provided'})

    kwargs = {'username_or_email' : username_or_email, "password" : password }
    verify_user = Controllers.connect_to_db(Controllers.login_user, kwargs)

    if not verify_user.get('status') or not verify_user.get("return_value"):
        return jsonify({'error' : "could not confirm username or password"})
    
    session["user_id"] = verify_user.get("return_value")
    session["user_name"] = username_or_email

    return jsonify({ 'username' : username_or_email, 'id' : verify_user.get("return_value")})

@app.route('/request_register/', methods=["GET"])
def request_register():
    if not session.get('beta'):
        return "access denied :("
    username = request.form.get("username")
    email = request.form.get("email")
    password = request.form.get("pass")

    if not Controllers.is_valid_password(password):
            return jsonify({'pass_error' : 'could not validate password'})
    is_valid_email = parseaddr(email)
    if not is_valid_email[0] == '' and is_valid_email[1] == '':
        return jsonify({'error': "Email address not valid."})

    kwargs = {'username' : username, "email" : email, "password" : password }
    register_user = Controllers.connect_to_db(Controllers.register_user, kwargs)

    if not register_user.get('status'):
        return jsonfiy({'error' : "Something went wrong attempting to register"})

    register_user = register_user.get('return_value')

    if hasattr(register_user, 'error'):
        return jsonify({'error' : register_user.get("error")})
    
    # send thank you for registering email.
    response = Email_Service.thank_for_sign_up(email, username)
    session["user_id"] = register_user.get("_id")
    session["user_name"] = username

    if username == 'admin':
        session['admin'] = True
    return jsonify({ 'username' : username, 'id' :  register_user.get("_id")})

@app.route('/login', methods=["GET", "POST"])
def login():
    if not session.get('beta'):
        return "access denied :("
    beta_key = session.get('beta')
    session.clear()
    session['beta'] = beta_key
    if request.method == "POST":

        if not request.form.get("username"):
            return render_template("login.html", error="Please enter a username")

        if not request.form.get("password"):
            return render_template("login.html", error="Must provide Password")

        username = request.form.get("username")
        provided_pass = request.form.get("password")

        kwargs = {'username_or_email' : username, 'password' : provided_pass}
        verify_user = Controllers.connect_to_db(Controllers.login_user, kwargs)
        if not verify_user.get("status") or not verify_user.get("return_value"):
            return render_template('login.html', error="Invalid username or email/password.")

        session["user_id"] = verify_user.get("return_value")
        session["user_name"] = username
        if username == 'admin':
            session['admin'] = True
            return redirect( url_for("scheduled_orders") )

        return redirect( url_for("index") )

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

        #check that all information has been provided
        is_valid_form = Controllers.validate_form(request.form)

        if not is_valid_form.get('return_valid').get("is_valid"):
            return render_template('register.html', error=is_valid_form.get('return_valid').get('message'))
        password = request.form.get("password")
        # validate password meets conditions
        if not Controllers.is_valid_password(passowrd):
            return render_template('register.html', error='could not validate password')

        username = request.form.get("username")
        email = request.form.get("email")
        is_valid_email = validate_email(email, verify=True)
        if not is_valid_email:
            return jsonify({'error': "Email address not valid."})        
        # check to see if username has already been added to database
        kwargs = {'username' : username, "email" : email, "password" : password}
        registered_user = Controllers.connect_to_db(Controllers.register_user, kwargs)

        if not registered_user.get('status'):
            return render_template('register.html', error = "Something went wrong.")
        registered_user = registered_user.get('return_value')

        if hasattr(registered_user, 'error'):
            return render_template("register.html", error = registered_user.get('error'))
        
        # send thank you for sign up email
        Email_Service.thank_for_sign_up(email, username)
        session["user_id"] = registered_user.get("_id")
        session["user_name"] = registered_user.get("username")

        if registered_user.get("return_value").get("username") == 'admin':
            session['admin'] = True
            return redirect( url_for("managedates") )
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

    ( all_dates, max_val) = Controllers.get_disabled_dates(True)
    sorted_dates = Controllers.sort_list_of_dates(all_dates)

    if request.method == "POST":
        data = request.form.get("data")
        kwargs = {'dates' : data.split("/")}

        if data[0] != '':

            if 'disable' in request.form:
                 Controllers.connect_to_db(Controllers.disable_dates, kwargs)

            if 'enable' in request.form:      
                Controllers.connect_to_db(Controllers.enable_dates, kwargs)

        return redirect(url_for("managedates"))

    return render_template("managedates.html", admin=True,
                                               maximum = max_val,
                                               sorted_dates = sorted_dates)

@app.route('/menusetter', methods=["GET", "POST"])
def menusetter():
    if not session.get('beta'):
        return "access denied :("

    if "user_id" not in session:
        print('menusetter, no id')
        return redirect(url_for('login'))

    if "admin" not in session:
        print('menusetter, not admin')
        return redirect(url_for('login'))
#############################################################################
    if request.method == "POST":
        return redirect(url_for("menusetter"))
    else:
        # all_menu_items = Controllers.connect_to_db(Controllers.get_menu_items)
        # if all_menu_items.get("status"):
        #     return render_template("menusetter.html", admin=True, menu=all_menu_items.get("return_value"))
        full_menu = execute("""
                    SELECT * FROM menu WHERE row = %s
                    """,(MENU_VERSION,))[0]

        entree_items = full_menu.get("entree")

        if entree_items != None:
            entree_items = json.loads(entree_items)
        else:
            entree_items = []

        side_items = full_menu.get("sides")

        if side_items != None:
            side_items = json.loads(side_items)
        else:
            side_items = []

        min_size = full_menu.get("minsize")

        side_headers = side_items.pop().get("categories")
        headers = entree_items.pop().get("categories")

        return render_template("menusetter.html", admin=True,
                                            entreeMenu = entree_items,
                                            sidesMenu = side_items,
                                            min_size = min_size,
                                            headers = headers,
                                            sideHeaders = side_headers)
        # return render_template("menusetter.html", admin=True, error="Something went wrong.")

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

    past_dates_sorted = Controllers.sort_list_of_dates(past_dates, "date", True)
    upcoming_dates_sorted = Controllers.sort_list_of_dates(upcoming_dates, "date")

    return render_template('scheduled_orders.html', admin=True, upcoming_orders = upcoming_dates_sorted, past_orders = past_dates_sorted)

@app.route('/commit_special_note/', methods=["POST"])
def commit_note():
    if not session.get('beta'):
        return "access denied :("

    orderId = request.form.get('orderId')
    special_note = request.form.get('note')
    
    if not orderId or special_note == None:
        return jsonify({'error' : 'Something went wrong!'})

    kwargs = {'orderId' : orderId, "note" : special_note}
    Controllers.connect_to_db(Controllers.set_order_special_note, kwargs)

    return jsonify({'succes' : ''})

@app.route('/get_prices/', methods=["GET"])
def get_prices():
    if not session.get('beta'):
        return "access denied :("
    prices = Controllers.connect_to_db(Controllers.parse_menu_prices)
    if prices.get("status") and prices.get("return_value"):
        return jsonify( prices.get("return_value") )
    return jsonify({"Error" : prices.get("error")})

@app.route('/_get_menu')
def get_menu():
    if not session.get('beta'):
        return "access denied :("
    menu = Controllers.connect_to_db(Controllers.get_menu_items)
    print(menu)
    if menu.get("status") and menu.get('return_value'):
        return jsonify({'Status': "Success", 'Menu' : menu.get('return_value') })
    return jsonify({"Status" : "Failed"})
    
# define route for flask to get favicon in static folder
# will not work during development
@app.route('/update_menu/', methods=["POST"])
def update_menu():
    result = Sheets_Service.read_menu()
    if type(result) != type(['list']):
        if hasattr(result, "Error"):
            return jsonify({"Status" : "Failed" , "Message" : result.get("Error")})
        return jsonify({"Status" : "Failed", "Message" : "Something went wrong reading google sheets."})
    kwargs = {'list_of_menu' : result}
    Controllers.connect_to_db(Controllers.update_menu_to_db, kwargs)
    return jsonify({"Status" : "Success", "Message" : "Menu updated."})

@app.route('/favicon.ico')
def favicon():
    return send_from_directory(os.path.join(app.root_path, 'static'),
                               'favicon.ico', mimetype='image/png')

def shutdown_server():
    func = request.environ.get('werkzeug.server.shutdown')
    if func is None:
        raise RuntimeError('Not running with the Werkzeug Server')
    func()

@app.route('/shutdown', methods=['POST'])
def shutdown():
    if not session.get('beta'):
        return "access denied :("
    if request.args.get("pw") == settings.get("SHUTDOWN"):
        shutdown_server()
        return 'Server shutting down...'

@app.route('/privacy_policy',methods=["GET"])
def privacy_policy():
    if not session.get('beta'):
        return "access denied :("
    return render_template("privacypolicy.html")

@app.route('/terms_and_conditions',methods=["GET"])
def terms_and_conditions():
    if not session.get('beta'):
        return "access denied :("
    return render_template('terms_and_conditions.html')

def parse_mapped_values(array_one, array_two):
    title = array_one.pop(0)
    map_title = array_two.pop(0)
    mappings = []

    if len(array_one) != len(array_two):
        raise Exception("missing values in mapping {} : {}".format(title, map_title))
    arrays_len = len(array_one)
    keys = ("name" , map_title )
    zipped_array = [[array_one[index], array_two[index]] for index in range(arrays_len)]

    for values in zipped_array:
        new_map_obj = {keys[0] : values[0], keys[1] : values[1]}
        mappings.append(new_map_obj)
    return mappings

if __name__ == '__main__':

    app.debug = True
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port)
