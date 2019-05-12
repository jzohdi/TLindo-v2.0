# -*- coding: utf-8 -*-
"""
Created on Thu Nov  8 16:12:38 2018

@author: jakez
"""
import datetime
import os
import sys
from flask import (Flask, flash, redirect, render_template, request,
                   session, url_for, jsonify, send_from_directory, send_file )
import requests
from passlib.apps import custom_app_context as pwd_context
from flask_session import Session
from flask_sqlalchemy import SQLAlchemy
from flask_jsglue import JSGlue
from config import getKeys
import psycopg2
import psycopg2.extras
import json
#from helpers import get_salt
from tempfile import mkdtemp
from smtplib import SMTP
import string
import random
from werkzeug import secure_filename
#import xlwt
from xlwt import Workbook
import xlrd
from copy import deepcopy as deep_copy
import stripe

"""
###############################################################################
######################### HELPER FUNCTIONS ####################################
###############################################################################
"""
def send_email(recipient, subject, msg):
    try:
        server = SMTP('smtp.gmail.com', 587)
        server.ehlo()
        server.starttls()
        server.ehlo()
        server.login(settings.get('EMAIL_ADDRESS'), settings.get('PASSWORD'))
        message = 'Subject: {}\n\n{}'.format(subject, msg)
        server.sendmail(settings.get('EMAIL_ADDRESS'), recipient, message)
        server.quit()
#        print('Success: Email sent!')
        return True
#            print(settings.get('PASSWORD'))
#            print(settings.get('EMAIL_ADDRESS'))
    except Exception as error:
        print(error)
        return False

##############################################################################
###################### function that sorts managedates table by date  ########
def sort_managedates():

    dates_json = execute("""SELECT * FROM managedates WHERE row = %s""",(MENU_VERSION,))[0].get("dates")
    dates = json.loads(dates_json)

    all_dates = [date.get('day') for date in dates]

    date_keys = dict( ( dates[index]['day'], index) for index in range( len(dates) ) )
    sort_dates = sorted(all_dates, key=lambda x: datetime.datetime.strptime(x, '%d %B, %Y'))

    final_sorted = []

    for date in sort_dates:
        final_sorted.append(dates[date_keys[date]])

    final_sorted = json.dumps(final_sorted)

    if dates_json != final_sorted:
        execute("""UPDATE managedates SET dates = %s WHERE row = %s""",(final_sorted, MENU_VERSION,))
    else:
        print("already sorted")

def move_disabled_dates():
    result = execute("""
                     SELECT * FROM managedates WHERE row = %s
                     """,(MENU_VERSION,))[0]
    max_val = result.get("max")
    new_array = []
    current_dates = {}
    dates = json.loads(result.get("dates"))

    for key, value in dates.items():

        date_in_records = datetime.datetime.strptime(key, '%d %B, %Y')
        is_date_passed = (datetime.datetime.today() > date_in_records)

        if not is_date_passed :

            current_dates[key] = value

            if float(value.get('sum')) >= max_val or value["disabled"] == 'True':
                new_array.append(key)

    new_array = json.dumps(new_array)
    current_dates = json.dumps(current_dates)

    execute("""
            UPDATE managedates SET dates = %s, disabled = %s WHERE row = %s
            """, (current_dates, new_array, MENU_VERSION,) )

def reconcile_managedates(order_date, cost):
    manage_dates = execute("""
                     SELECT * FROM managedates WHERE row = %s
                     """,(MENU_VERSION,))[0]

    max_val = manage_dates.get("max")
    current_disabled = json.loads(manage_dates.get("disabled") )
    current_dates = json.loads(manage_dates.get("dates") )

    if order_date in current_disabled:
        return False

    if order_date not in current_dates:
        disabled = False
        if cost >= max_val:
            disabled = True
            current_disabled.append(order_date)
        current_dates[order_date] = { 'sum' : str(cost), 'disabled' : str(disabled)}
    else:
        new_sum = float(current_dates[order_date].get('sum')) + cost
        current_dates[order_date]['sum'] = new_sum
        if new_sum >= max_val:
            current_dates[order_date]['disabled'] = str(True)

    execute("""UPDATE managedates SET dates = %s, disabled = %s WHERE row = %s""",
            (json.dumps(current_dates), json.dumps(current_disabled), MENU_VERSION,))
    return True

###################################################################################
def format_amount_to_cents(original_amount):
    if type(original_amount) == type('string'):
        original_amount = float(original_amount)
    original_amount *= 100
    return int(original_amount)

def log_exception(message):
    with open('error_log.txt', 'a+') as file:
        file.write(message + ' ' + str(datetime.datetime.now()) + '\n')
        file.close()

def get_prices_from_db():
    prices = execute("""SELECT * FROM menu
                     """)
    prices = prices[-1]
    entrees = json.loads(prices.get("entree"))
    all_prices =  parse_menu_for_prices(entrees)

    sides = json.loads(prices.get('sides'))
    all_prices = add_sides_prices(all_prices, sides)
    return all_prices

def validate_date(date_string):
    try:
        key = datetime.datetime.strptime(date_string, '%d %B, %Y')
        return key
    except:
        return False

def parse_and_sort_dates(list_of_orders, include_editable = False):
    errors = []
    past_dates = []
    upcoming_dates = []
    for orders_for_user in list_of_orders:
        all_orders = orders_for_user.get('orders', '[{"date": "None"}]')
        try:

            this_users_orders = json.loads(all_orders)
            for each_order in this_users_orders:

                try:

                    this_order_date = each_order.get('date', "fail")

                    try:
                        each_order['order'] = json.loads(each_order.get('order'))
                    except Exception:
                        pass
#                    print(type(each_order.get('order')))
                    #validate date is correct format
                    is_valid_date = validate_date(this_order_date)

                    if is_valid_date:
                        is_date_passed = (datetime.datetime.today() > is_valid_date)

                        if include_editable:
                            if is_valid_date > datetime.datetime.today() + datetime.timedelta(hours=24):
                                each_order['editable'] = True

                        if is_date_passed:

                            past_dates.append(each_order)
                        else:
                            upcoming_dates.append(each_order)

                    else:

                        errors.append(each_order)
                except:

                    errors.append(each_order)

        # exception if order is in incorrect format
        except:

            errors.append(all_orders)
#    print(errors)
    return (past_dates, upcoming_dates, errors)

def get_salt(N):
    return ''.join(random.SystemRandom().choice(string.ascii_lowercase +
                   string.ascii_uppercase + string.digits) for _ in range(N))

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

def get_sorted_dates( dictionary_in ):

    dates_list = [key for key in dictionary_in]
    sort_dates = list(sorted(dates_list, key=lambda x: datetime.datetime.strptime(x, '%d %B, %Y')))
 #   print(sort_dates)
    return sort_dates

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

def add_note_to_order(user_orders, note, num):
    try:
        for index, order in enumerate(user_orders):
            order_num = order.get('order_num')
            if order_num == num or order_num == int(num):
                if len(note) == 0 and 'special-note' in order:
                    order.pop('special-note')
                else:
                    order['special-note'] = note
                user_orders[index] = order
                return user_orders

        return []
    except Exception as e:
        log_exception("line 413, " + str(e) )
        return []

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
PASSWORD_RECOVERY_SUB = "Taco Lindo - Password Recovery"
PASSWORD_RECOVERY_MSG = "We have recieved a password recovery request for your account\n" \
                        "If you did not make this request, please ignore this message.\n" \
                        "Otherwise go to this link {} within 24 hours to reset your password."
PLACE_ORDER_SUBJECT = "Order Placed: Taco Lindo"
ORDER_MESSAGE = ("Thank you for choosing Taco Lindo for your catering!\n"
                 "We recieved your order details, and we saved the date shown below.\n"
                 "Please take a second to review and make sure everything looks correct.\n{}")

def commit_settings(params):
    new_obj = {}
    if params:

        for key in params:
            new_obj[key] = params[key]
        return new_obj
    else:
        environment = ['BETA_KEY', 'DATABASE_URL', 'DB', 'EMAIL_ADDRESS', 'HOST',
                'PASSWORD', 'PORT', 'PW', 'SHUTDOWN', 'STRIPE_KEY', 'USER', 'SECRET_KEY']
        for variable in environment:
            new_obj[variable] = os.environ.get(variable)
        return new_obj

params = getKeys()

settings = commit_settings(params)

settings['SECRET_KEY'] = os.environ.get('SECRET_KEY', str(get_salt(25)))


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
@app.route('/')
def index():
    pw = request.args.get('pw')

    if pw != settings.get('BETA_KEY') and not session.get('beta'):
        return "access denied :("

    session['beta'] = True

    if 'admin' in session:
        return redirect(url_for('scheduled_orders'))

    move_disabled_dates()

    dates = execute("""
                    SELECT * FROM managedates WHERE row = %s
                    """,( MENU_VERSION,))

    disabled = dates[0].get("disabled")

    return render_template('index.html', dates=disabled)

@app.route('/user_orders', methods=["GET", "POST"])
def user_orders():
    if not session.get('beta'):
        return "access denied :("
    if 'user_id' not in session:
        return redirect(url_for('login'))

    user_key = str(session.get('user_id'))

    all_orders = execute("""
                         SELECT orders FROM allorders WHERE id = %s
                         """, (user_key,))

    (past_dates, upcoming_dates, errors) = parse_and_sort_dates(all_orders, True)

    past_dates_reverse_sorted = sorted(past_dates, key = lambda item : item.get('date'), reverse=True)
    sorted_upcoming_dates = sorted(upcoming_dates, key = lambda item : item.get('date'))
#    print(sorted_upcoming_dates)
#    print(past_dates_reverse_sorted)

#    session['upcoming_orders'] = sorted_upcoming_dates

    return render_template('userorders.html', admin=False, upcoming_orders = sorted_upcoming_dates, past_orders = past_dates_reverse_sorted)

@app.route('/orderlookup', methods=["GET", "POST"])
def orderlookup():
    if not session.get('beta'):
        return "access denied :("
    if request.method == "POST":
#        print('here')
        confirmation_code = request.form.get("confirmationCode")
        if len(confirmation_code) < 5:
            return render_template('orderlookup.html', error="Invalid Code")
        get_orders = execute("""
                            SELECT orders FROM allorders WHERE id = %s
                            """, (confirmation_code,))
#        print(get_orders)
        user_orders = json.loads(get_orders[0].get("orders"))
#        print(user_orders)
        user_orders[0]['order'] = user_orders[0].get('order')
#        print(user_orders)
        session['guest_code'] = confirmation_code
        return render_template("orderlookup.html", orders=user_orders)
    else:
        return render_template("orderlookup.html")

@app.route('/change_password', methods=["POST"])
def change_password():
    if not session.get('beta'):
        return "access denied :("
    if 'user_id' not in session:
        redirect( url_for('login'))

    old_password = request.form.get('current-password')
    new_password = request.form.get('new-password')
    confirm_new_password = request.form.get('confirm-new-passowrd')

    unique = session.get('user_id')

    if not old_password or not new_password or not confirm_new_password:
        return render_template('user_settings.html', error='Could not validate password')
    if new_password != confirm_new_password:
        return render_template('user_settings.html', error='Passwords do not match')

    if not len(new_password) >= 8 or not any([x.isdigit() for x in new_password]) \
    or not any([x.isupper() for x in new_password]) or not any([x.islower() for x in new_password]):
        return render_template('user_settings.html', error='Could not validate password' )

    current_user = execute(""" SELECT * FROM users WHERE id = %s
                           """,( unique,) )
    hash_salt = current_user[0]['salt']

    if len(current_user) != 1:
        return render_template("user_settings.html", error="Could not validate password")

    if not pwd_context.verify(old_password + hash_salt, current_user[0]['password']):
        return render_template("user_settings.html", error="Could not validate password")

    encrypted = pwd_context.hash(new_password + hash_salt)

    result = (""" UPDATE users SET password = %s WHERE id = %s
              """, (encrypted, unique,) )
    if not result:
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
        result = execute("""SELECT * FROM users WHERE email = %s
                         """, (email,))
        if len(result) != 1:
            return render_template('forgotpassword.html', error="Could not find email in records")

        user = result[0]
        hash_code = get_salt(45)

        set_new_pass_link = 'http://127.0.0.1:5000'+'/password_recovery?code={}&recipient={}'.format(hash_code, email)
        SUBJECT = PASSWORD_RECOVERY_SUB
        MESSAGE = PASSWORD_RECOVERY_MSG.format(set_new_pass_link)
#        print(MESSAGE)
        did_message_send = send_email(email, SUBJECT, MESSAGE)
        if (did_message_send):

            current_time = str(datetime.datetime.now())
            result = execute("""INSERT INTO passwordrecovery (code, email, timestamp) VALUES (%s, %s, %s)
                             """, (hash_code, email, current_time,))
            print(result)
            return render_template('forgotpassword.html', error="Resent link sent!")
        else:
            return render_template('forgotpassword.html', error="Something went wrong.")
#        print(hash_code)

    else:
        return render_template('forgotpassword.html')
@app.route('/password_recovery', methods=["POST", "GET"])
def password_recovery():
    if not session.get('beta'):
        return "access denied :("

    if request.method == "POST":
        code = session.get('recovery_code')
        email = session.get('recovery_email')
        user_id = session.get('recovery_id')

        valid_email_code = execute("""SELECT * FROM passwordrecovery WHERE code = %s
                                      """, (code,))
        if len(valid_email_code) != 1 or email != valid_email_code[0].get('email'):
            print('1')
            return render_template('forgotpassword.html', error = 'Something went wrong, please request a new link.')

        new_password = request.form.get('new-password')
        confirm_new_password = request.form.get('confirm-new-password')

        if not new_password or not confirm_new_password or new_password != confirm_new_password:
            return render_template('password_recovery.html', error = 'Could not confirm new passowrd.')

        if not len(new_password) >= 8 or not any([x.isdigit() for x in new_password]) \
        or not any([x.isupper() for x in new_password]) or not any([x.islower() for x in new_password]):
            return render_template('password_recovery.html', error = 'New password does not meet password requirements' )

        hash_salt = get_salt(12)

        pass_hash = pwd_context.hash(new_password + hash_salt)

        result = execute(""" UPDATE users SET password = %s, salt = %s WHERE id = %s
                         """, (pass_hash, hash_salt, user_id,))

        session['user_id'] = user_id
        session.pop('recovery_code')
        session.pop('recovery_email')
        session.pop('recovery_id')
        return render_template('index.html')

    else:
        code = request.args.get('code')
        email = request.args.get('recipient')
        print(email)
        if not code or not email:
            return render_template('forgotpassword.html', error="Could not retrieve new pass code")

        match_code_to_database = execute("""SELECT * FROM passwordrecovery WHERE code = %s
                                         """, (code,))
        if len(match_code_to_database) != 1:
            return render_template('forgotpassword.html', error="Could not perform recovery, please request a new link")

        if not match_code_to_database[0].get('email') == email:
            return render_template('forgotpassword.html', error="Could authenticate email, please request a new link")


        confirm_user = execute("""SELECT * FROM users WHERE email = %s
                        """, (email,))

        if len(confirm_user) != 1:
            print('2')
            return render_template('forgotpassword.html', error = 'Something went wrong, please request a new link.')

        user_id = confirm_user[0].get('id')
        username = confirm_user[0].get('username')

        request_timestamp = match_code_to_database[0].get('timestamp')
        request_datetime = datetime.datetime.strptime(request_timestamp, '%Y-%m-%d %H:%M:%S.%f')

        request_plus24hr = datetime.timedelta(hours = 24) + request_datetime
        is_less_than24hours = request_plus24hr > datetime.datetime.now()

        if is_less_than24hours:
            session['recovery_id'] = user_id
            session['recovery_code'] = code
            session['recovery_email'] = email
            session['user_name'] = username
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
    last_order = session.get('recent_order')
    try:
        last_order = json.loads(last_order)
    except:
        if 'user_id' not in session:
            return redirect(url_for('orderlookup'))
        else:
            return redirect(url_for('user_orders'))
    name = last_order.get('name')
    date = last_order.get('date')
    phone = last_order.get('phone')
    email = last_order.get('email')
    address = last_order.get('address')
    order = last_order.get('order')
    comments = last_order.get('comments')
    total = last_order.get('price')
    paid = last_order.get('paid')
    confirm_code = 'guest_code' in session
    confirmation_code = session.get('user_name') if 'user_name' in session else session.get('guest_code')

    return render_template('order_placed.html', name = name, date = date, phone = phone,
                                           email = email, address = address, order = order,
                                           comments = comments, total = total, code = confirmation_code,
                                           confirm_code = confirm_code, paid = paid)

def format_order_message( order_info ):
    to_return = ''
    for key, value in order_info.items():
        if key != 'id' and key != 'order_num':
            to_return += str(key).capitalize() + ': '+ str(value) + "\n"
    print(to_return)
    return ORDER_MESSAGE.format(to_return)

@app.route('/charge', methods=["POST"])
def charge():
    if not session.get('beta'):
        return "access denied :("

    if 'user_id' not in session and 'guest_code' not in session:
        return jsonify({'error' : 'must log in or continue as guest'})

    user_id = str( session.get('user_id') ) if 'user_id' in session else session.get('guest_code')

    order_information = { 'name' : request.form.get('name'),
                         'date' : request.form.get('date'),
                         'phone' : request.form.get('phone'),
                         'email' : request.form.get('email'),
                         'address' : request.form.get('address'),
                         'order' : request.form.get('order'),
                         'comments' : request.form.get('notes'),
                         'id' : user_id,
                         'order_num' : 1 }
    if None in order_information.values():
        return jsonify({'error' : 'Some information missing from order'})

    current_prices = get_prices_from_db()
    (order_information["price"], order_information['order']) = confirm_order_price(order_information.get('order'), current_prices)

    if not order_information.get('price'):
        return jsonify({'error' : 'could not confirm order pricing'})

    email = request.form.get('email')
    SUBJECT = PLACE_ORDER_SUBJECT
    MESSAGE = format_order_message(order_information)
    did_message_send = send_email(email, SUBJECT, MESSAGE)

    stripe.api_key = settings.get("STRIPE_KEY")
    token = request.form['stripeToken']

    try:
        charge = stripe.Charge.create(
        amount= format_amount_to_cents(order_information['price']),
        currency='usd',
        description='Test Charge',
        source=token, )

        amount_charged = charge.get("amount", "Charge was not processed")
        didPay = charge.get('paid')
        if not didPay:
            return jsonify({"error" : "charge could not be complete"})
        order_information['paid'] = "$" + str(amount_charged)[:-2] + "."+ str(amount_charged)[-2:]

        result = reconcile_managedates(order_information.get("date"), order_information.get("price"))
        if not result:
            log_exception("could not reconcile dates with amount place")

        place_order_in_db( user_id, order_information )
        session['recent_order'] = json.dumps(order_information)
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
      # Too many requests made to the API too quickly
      log_exception(str(e) + ' Too many requests made to API too quickly')
      return jsonify({'error' : "Our servers are currently over used please try again later."})
    except stripe.error.InvalidRequestError as e:
      # Invalid parameters were supplied to Stripe's API
      log_exception(str(e) + ' Invalid parameters were passed to Stripe API')
      return jsonify({'error' : 'There was a problem processing your payment, no charge was made.'})
    except stripe.error.AuthenticationError as e:
      # Authentication with Stripe's API failed
      # (maybe you changed API keys recently)
      log_exception(str(e) + ' Stripe API athentication failed, check API keys')
      return jsonify({'error' : "Stripe authentication failed."})
    except stripe.error.APIConnectionError as e:
      # Network communication with Stripe failed
      return jsonify({'error' : 'Network Communication error, no charge was made.'})
    except stripe.error.StripeError as e:
      # Display a very generic error to the user, and maybe send
      # yourself an email
      return jsonify({'error' : 'There was a problem processing your payment, no charge was made.'})
    except Exception as e:
      # Something else happened, completely unrelated to Stripe
      log_exception(str(e) + ' There was a payment processing error unrelated to Stripe')
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

@app.route('/change_contact_info/', methods=["POST"])
def change_contact_info():
    if not session.get('beta'):
        return "access denied :("

    if 'user_id' not in session and 'guest_code' not in session:
        return jsonify({'error': 'failed'})

    order_num = request.form.get('order_num')
    name = request.form.get('Name')
    phone = request.form.get('Phone')
    address = request.form.get('Address')
    email = request.form.get('Email')

    unique_id = str(session.get('user_id')) if 'user_id' in session else session.get('guest_code')

    if any([order_num == None, name == None, phone == None, address == None,
            email == None, unique_id == None]):
        return jsonify({'error': 'missing arguments'})

    all_users_orders = execute("""SELECT orders FROM allorders WHERE id = %s
                                 """, (unique_id,) )
    users_orders = json.loads(all_users_orders[0].get('orders'))

    for index, each_order in enumerate(users_orders):
#        each_order.pop('editable')
        if each_order.get('order_num') == int(order_num):
            each_order['name'] = name
            each_order['phone'] = phone
            each_order['address'] = address
            each_order['email'] = email
        users_orders[index] = each_order

    dumps_upcoming_orders = json.dumps(users_orders)

    execute("""UPDATE allorders SET orders = %s WHERE id = %s
            """,(dumps_upcoming_orders, unique_id,))

    return jsonify({'error' : "Contact Set!"})

@app.route('/edit_order', methods=["POST", "GET"])
def edit_order():
    if not session.get('beta'):
        return "access denied :("

    if 'user_id' not in session:
        return redirect( url_for('login') )

    user_id = str(session.get('user_id'))
    order_num = request.args.get('order_num')

    orders = execute(""" SELECT orders FROM allorders WHERE id = %s
                     """, (user_id,))

    all_users_orders = orders[0].get('orders')

    order_to_edit = getOrder_and_checkIfValidDate(all_users_orders, order_num)

    if order_to_edit == None:
        return redirect( url_for('user_orders'))

    session['edit_order_num'] = order_num
    return render_template('edit_order.html', order = order_to_edit)

@app.route('/commit_order_edit/', methods=["POST"])
def commit_edit():
    if not session.get('beta'):
        return "access denied :("

    order = request.form.get('order')
    current_prices = get_prices_from_db()
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

    guest_code = get_salt(8)
    session['guest_code'] = guest_code

    return jsonify({'code' : guest_code})

@app.route('/request_login/', methods=["GET"])
def request_login():
    if not session.get('beta'):
        return "access denied :("
    username = request.args.get('username', '')
    password = request.args.get('pass', '')

    if username == ''  or password == '':
        return jsonify({'error' : 'Username or password not provided'})
    users = execute("""
                    SELECT * FROM users WHERE username = %s OR email = %s
                    """, (username, username,))
    if len(users) != 1:
        return jsonify({'error' : 'could not confirm username or password'})
    if not pwd_context.verify(password + users[0]['salt'], users[0]['password']):
        return jsonify({'error' : 'could not confirm username or password'})

    session["user_id"] = users[0]["id"]
    session["user_name"] = username

    return jsonify({ 'username' : username, 'id' : users[0]["id"]})

@app.route('/request_register/', methods=["GET"])
def request_register():
    if not session.get('beta'):
        return "access denied :("
    username = request.args.get("username")
    email = request.args.get("email")
    password = request.args.get("pass")

    if not len(password) >= 8 or not any([x.isdigit() for x in password]) \
    or not any([x.isupper() for x in password]) or not any([x.islower() for x in password]):
            return jsonify({'pass_error' : 'could not validate password'})

    already_exists = execute("""
                             SELECT * FROM users WHERE username = %s OR email = %s
                             """, (username, email))
    if len(already_exists) >= 1:
        error_var = "username" if (username == already_exists[0]["username"]) else "email"
        return jsonify({ 'error': error_var })

    hash_salt = get_salt(12)

    pass_hash = pwd_context.hash(password + hash_salt)

    result = execute("""
                     INSERT INTO users (username, email, password, salt)
                     VALUES (%s, %s, %s, %s)
                     """,(username, email, pass_hash, hash_salt))

    confirm_user_added = execute("""
                          SELECT * FROM users WHERE username = %s
                          """,(username,))
    #print(confirm_user_added)

    user_id_num = confirm_user_added[0]["id"]

    session["user_id"] = user_id_num
    session["user_name"] = confirm_user_added[0].get('username')

    if username == 'admin':
        session['admin'] = True
    return jsonify({ 'username' : username, 'id' :  user_id_num})

@app.route('/login', methods=["GET", "POST"])
def login():
    if not session.get('beta'):
        return "access denied :("
    """"
    session.pop("admin", None)
    session.pop("user_id", None)
    session.pop("user_name", None)
    """
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

        users = execute("""
                        SELECT * FROM users WHERE username = %s OR email = %s
                        """, (username, username,))
        if len(users) != 1:
            return render_template("login.html", error="invalid username/password")
        if not pwd_context.verify(provided_pass + users[0]['salt'], users[0]['password']):
            return render_template("login.html", error="invalid username/password")

        session["user_id"] = users[0]["id"]
        session["user_name"] = username
#        print("user logged in succesfully")
        #print(username)
        if users[0].get("username") == 'admin':
            session['admin'] = True
            return redirect( url_for("scheduled_orders") )

        return redirect( url_for("index") )

    return render_template("login.html")

@app.route('/logout', methods=["GET", "POST"])
def logout():
    if not session.get('beta'):
        return "access denied :("
    """
    session.pop("user_id", None)
    session.pop("user_name", None)
    session.pop("admin", None)
    """
    beta_key = session.get('beta')
    session.clear()
    session['beta'] = beta_key
    return redirect(url_for("index"))

@app.route('/register', methods=["GET", "POST"])
def register():
    if not session.get('beta'):
        return "access denied :("
    """
    session.pop("admin", None)
    session.pop("user_name", None)
    session.pop("user_id", None)
    """
    beta_key = session.get('beta')
    session.clear()
    session['beta'] = beta_key
    if request.method == "POST":

        #check that all information has been provided
        if not request.form.get("username"):
            return render_template("register.html", error="must provide username")
        if not request.form.get("email"):
            return render_template("register.html", error="must provide email")
        if not request.form.get("password"):
            return render_template("register.html", error="must provide password")
        if not request.form.get("confirm-password"):
            return render_template("register.html", error="could not confirm password")
        if request.form.get("password") != request.form.get("confirm-password"):
            return render_template("register.html", error="could not confirm password")

        password = request.form.get("password")
# validate password meets conditions
        if not len(password) >= 8 or not any([x.isdigit() for x in password]) \
        or not any([x.isupper() for x in password]) or not any([x.islower() for x in password]):
            return render_template('register.html', error='could not validate password')

        username = str(request.form.get("username"))
        email = str(request.form.get("email"))
        # check to see if username has already been added to database
        already_exists = execute("""
                                 SELECT * FROM users WHERE username = %s OR email = %s
                                 """, (username, email))
        if len(already_exists) >= 1:
            error_var = "username" if (username == already_exists[0]["username"]) else "email"

            return render_template("register.html", error="{} unavailable".format(error_var))

        hash_salt = get_salt(12)

        pass_hash = pwd_context.hash(password + hash_salt)

        result = execute("""
                         INSERT INTO users (username, email, password, salt)
                         VALUES (%s, %s, %s, %s)
                         """,(username, email, pass_hash, hash_salt))
        #print(result)

        confirm_user_added = execute("""
                              SELECT * FROM users WHERE username = %s
                              """,(username,))
        #print(confirm_user_added)

        user_id_num = confirm_user_added[0]["id"]

        session["user_id"] = user_id_num
        session["user_name"] = confirm_user_added[0]["username"]

        if username == 'admin':
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

    #sort_managedates()
    move_disabled_dates()

    dates = execute("""
                    SELECT * FROM managedates WHERE row = %s
                    """, (MENU_VERSION,))

    all_dates = json.loads(dates[0].get("dates"))

    sorted_dates = get_sorted_dates(all_dates)

    max_val = dates[0].get("max")

    # must convert sum - string to sum - integer for each date
    #dates = parse_dictionary(all_dates)
    #print(all_dates)

    if request.method == "POST":
        print(request.form)
        data = request.form.get("data")
        data = data.split("/")
        if data[0] != '':
            if 'disable' in request.form:
                for date in data:
                    if date not in all_dates:
                        all_dates[date] = {'sum' : '0', 'disabled' : 'True' }
                    else:
                        all_dates[date]['disabled'] = 'True'

            if 'enable' in request.form:
                for date in data:
                    if date in all_dates:
                        if all_dates[date]['sum'] == '0':
                            all_dates.pop(date, None)
                        else:
                            all_dates[date]['disabled'] = 'False'

            dates_to_add = json.dumps(all_dates)

            execute("""
                UPDATE managedates SET dates = %s WHERE row = %s
                """,(dates_to_add, MENU_VERSION,))

        return redirect(url_for("managedates"))

    return render_template("managedates.html", dates = all_dates, admin=True,
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

        set_menu = []

        if 'submit-entrees' in request.form:

            columns = request.form.get("submit-entrees").split(",")
            print(columns)
            # we know that since there are 4 columns : this will iterate each
            # entree set as each entree's input fields only differ by index num
            # also ( -1 ) due to the submit button being part of form

            for entree in range( int( len(request.form)/len(columns) ) ):

                item_num = str(entree)
                item_dict = {}
                for column in columns:
                    item_dict[column] = request.form.get(item_num + column)

                set_menu.append(item_dict)

                """item_dict = {'item' : request.form.get(item_num + 'item'),
                             'flavors': request.form.get(item_num + 'flavors'),
                             'sizes': request.form.get(item_num + 'sizes'),
                             'description' : request.form.get(item_num + 'description')} """
            set_menu.append({ 'categories' : [item.capitalize() for item in columns ]})
            insert_menu = json.dumps(set_menu)

            execute("""
                    UPDATE menu SET entree = %s WHERE row = %s
                    """,(insert_menu, MENU_VERSION, ))

        elif 'submit-sides' in request.form:

            columns = request.form.get("submit-sides").split(",")

            for side in range( int( len(request.form)/len(columns) ) ):

                item_num = str(side)
                item_dict = {}
                for column in columns:
                    item_dict[column] = request.form.get("sides" + item_num + column)

                set_menu.append(item_dict)

            set_menu.append({ 'categories' : [item.capitalize() for item in columns ]})

            insert_menu = json.dumps(set_menu)

            execute("""
                    UPDATE menu SET sides = %s WHERE row = %s
                    """, (insert_menu, MENU_VERSION, ) )
        elif 'submit-min' in request.form:
            minimum = int(request.form.get("set_min"))
            execute("""
                    UPDATE menu SET minsize = %s WHERE row = %s
                    """,(minimum, MENU_VERSION,))

        return redirect(url_for('menusetter'))

#############################################################################
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

@app.route('/scheduled_orders', methods=["GET", "POST"])
def scheduled_orders():
    if not session.get('beta'):
        return "access denied :("
    if "user_id" not in session:
        return redirect(url_for('login'))

    if "admin" not in session:
        return redirect(url_for('login'))

    all_orders = execute("""
                        SELECT orders FROM allorders
                        """, ("N/A",))
#    print(all_orders)

    (past_dates, upcoming_dates, errors) = parse_and_sort_dates(all_orders)

    past_dates_reverse_sorted = sorted(past_dates, key = lambda item : validate_date(item.get('date')), reverse=True)
    sorted_upcoming_dates = sorted(upcoming_dates, key = lambda item : validate_date(item.get('date')) )

    return render_template('scheduled_orders.html', admin=True, upcoming_orders = sorted_upcoming_dates, past_orders = past_dates_reverse_sorted)

@app.route('/commit_special_note/', methods=["POST"])
def commit_note():
    if not session.get('beta'):
        return "access denied :("

    user_id = request.form.get('user_id')
    order_num = request.form.get('order_num')
    special_note = request.form.get('note')

    if not user_id or not order_num or not special_note:
        return jsonify({'error' : 'Something went wrong!'})

    users_orders = execute("""SELECT orders FROM allorders WHERE id = %s
                           """, (user_id,))
    if len(users_orders) < 1:
        return jsonify({'error' : 'Could not confirm user in database.'})
    user_orders = ""
    try:
        user_orders = json.loads( users_orders[0].get('orders') )
    except Exception as err:
        log_exception(error)
        return jsonify({'error' : 'Something went wrong.'})

    initial_length = len(user_orders)
    user_orders = add_note_to_order(user_orders, special_note, order_num)
    final_length = len(user_orders)

    # check that no data was lost during insertion of note.
    if initial_length != final_length:
        return jsonify({'error' : 'Aborted when checking data corruption.'})

    final_user_orders = json.dumps(user_orders)
    result = execute(""" UPDATE allorders SET orders = %s WHERE id = %s
                     """, (final_user_orders, user_id))
#    print(result)
#    print(type(result))
    return jsonify({'succes' : ''})
@app.route('/get_prices/', methods=["GET"])
def get_prices():
    if not session.get('beta'):
        return "access denied :("
    prices = execute("""
                     SELECT * FROM menu
                     """)
    prices = prices[-1]
    entrees = json.loads(prices.get("entree"))
    sides = json.loads(prices.get('sides'))
    prices = parse_menu_for_prices(entrees)
    prices = add_sides_prices(prices, sides)
    return jsonify({ 'entrees' : prices })

@app.route('/_get_menu')
def get_menu():
    if not session.get('beta'):
        return "access denied :("
    menu = execute("""
                   SELECT * FROM menu WHERE row = %s
                   """,(MENU_VERSION,))[0]

    raw_menu = json.loads(menu.get("entree"))
    prices = parse_menu_for_prices(raw_menu)
#    print(prices)
    sides_menu = json.loads(menu.get("sides"))
    prices = add_sides_prices(prices, sides_menu)
#    print('prices with sides:', prices)
    menu["pricing"] = prices

    session["entree_prices"] = json.dumps(prices)

    menu["entree"] = raw_menu
    menu["sides"] = sides_menu
    menu["minsize"] = str(menu.get("minsize"))

    return jsonify(menu)
# define route for flask to get favicon in static folder
# will not work during development
@app.route('/upload_menu/', methods=["POST", "GET"])
def load_file():
    if not session.get('beta'):
        return "access denied :("
    if request.method == 'POST':
        f = request.files['file']
        try:
            os.remove(f.filename)
        except Exception as err:
            print(err)
        f.save(f.filename)
        location = os.path.dirname(os.path.realpath(__file__)) + "/" + f.filename
        wb = xlrd.open_workbook(location)
        entrees = get_listOfItems_fromExcel(wb, 0)
        sides = get_listOfItems_fromExcel(wb, 1)

        result = execute("""UPDATE menu SET entree = %s, sides = %s WHERE row = %s
                         """,(json.dumps(entrees), json.dumps(sides), MENU_VERSION,))
        # print(session.get('user_id'))
        return redirect( url_for("menusetter", admin=True) )
    return 'waiting for file'

@app.route('/download_menu/')
def return_files():
    if not session.get('beta'):
        return "access denied :("
    menu = execute(""" SELECT * FROM menu
               """, ('N/A',))
    filename = 'menu.xls'
    save_xls( menu , filename)
    dir_path = os.path.dirname(os.path.realpath(__file__))
    try:
        return send_file(dir_path+'/menu.xls')
    except Exception as error:
        log_exception(error)

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

if __name__ == '__main__':
    app.debug = True
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port)
    # result = execute(""" SELECT * FROM managedates WHERE row = %s
    #                 """,('1',))
    # print(result)
#    result = execute(""" SELECT orders FROM allorders WHERE id =%s
#                     """,('7',))
#    result = json.loads( result[0].get('orders') )[-1].get('order')
#    print(result)
#    final_result = parse_items_resolution(result)
#    print(final_result)
    """
    API_ENDPOINT = "https://sandbox.api.intuit.com/quickbooks/v4/payments/charges"
    API_KEY = ""


    result = requests.post('http://httpbin.org/post')
    print(result.body)
    """
    #app.add_url_rule('/favicon.ico',
    #            redirect_to=url_for('static', filename='favicon.ico'))