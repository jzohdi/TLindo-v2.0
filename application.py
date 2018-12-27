# -*- coding: utf-8 -*-
"""
Created on Thu Nov  8 16:12:38 2018

@author: jakez
"""
import datetime
import os
import sys
from flask import Flask, flash, redirect, render_template, request, session, url_for, jsonify, send_from_directory
from passlib.apps import custom_app_context as pwd_context
from flask_session import Session
from flask_sqlalchemy import SQLAlchemy
from flask_jsglue import JSGlue
from config import getKeys
import psycopg2
import psycopg2.extras
import json
from helpers import get_salt, parse_dictionary
from tempfile import mkdtemp

MENU_VERSION = '1'
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
def get_sorted_dates( dictionary_in ):
    
    dates_list = [key for key in dictionary_in]
    sort_dates = list(sorted(dates_list, key=lambda x: datetime.datetime.strptime(x, '%d %B, %Y')))
 #   print(sort_dates)
    return sort_dates
    
def move_disabled_dates():
    result = execute("""
                     SELECT * FROM managedates WHERE row = %s
                     """,(MENU_VERSION,))[0]
    max_val = result.get("max")
    new_array = []
    dates = json.loads(result.get("dates"))
    #print(dates)
    for key, value in dates.items():
        if int(value.get('sum')) >= max_val or value["disabled"] == 'true':
            new_array.append(key)
    new_array = json.dumps(new_array)
    execute("""
            UPDATE managedates SET disabled = %s WHERE row = %s
            """, (new_array, MENU_VERSION,) )
    
###################################################################################
settings = {}

params = getKeys()
for key in params:
    
    settings[key] = params[key]
    
settings["SECRET_KEY"] = str(get_salt(25))

def execute(statement, values):
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
    except:
        print("database action failed")
    finally:
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
#app.static_folder = 'static'

jsglue = JSGlue(app)

app.jinja_env.add_extension('jinja2.ext.loopcontrols')
app.config["SESSION_FILE_DIR"] = mkdtemp()
app.config["SESSION_PERMANENT"] = False
app.config["SESSION_TYPE"] = "filesystem"
app.config['TEMPLATES_AUTO_RELOAD'] = True

secret_Key = settings.get("SECRET_KEY")

app.secret_key = secret_Key

app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://%(user)s:\
%(pw)s@%(host)s:%(port)s/%(db)s' % POSTGRES

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
app.config['TEMPLATES_AUTO_RELOAD'] = True
app.jinja_env.globals.update(classForButton=classForButton)
app.jinja_env.globals.update(isfree=isfree)
app.jinja_env.add_extension('jinja2.ext.loopcontrols')
"""
#print(settings)

"""
app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://%(user)s:\
%(pw)s@%(host)s:%(port)s/%(db)s' % POSTGRES

app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

app.config["SESSION_FILE_DIR"] = mkdtemp()

app.config["SESSION_PERMANENT"] = False

app.secret_key = os.environ.get("SECRET_KEY", None)
app.config["SESSION_TYPE"] = "filesystem"

sess = Session()
sess.init_app(app)
"""

#print( POSTGRES )
#print( params )


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
            file_path = os.path.join(app.root_path,
                                     endpoint, filename)
            values['q'] = int(os.stat(file_path).st_mtime)
    return url_for(endpoint, **values)

""""""
@app.route('/')
def index():
    if 'admin' in session:
        return redirect(url_for('managedates'))
    
    move_disabled_dates()
    
    dates = execute("""
                    SELECT * FROM managedates WHERE row = %s
                    """,( MENU_VERSION,))
    disabled = dates[0].get("disabled")
#    max_val = dates[0].get("max")
#    calender = json.loads(dates[0]["dates"])
#    print(calender)

    return render_template('index.html', dates=disabled)

@app.route('/confirmCart', methods=["POST", "GET"])
def confirmCart():

    return render_template("confirmCart.html")

@app.route('/request_login/', methods=["GET"])
def request_login():
    username = request.args.get('username', '')
    password = request.args.get('pass', '')
    if username == ''  or password == '':
        return "error logging in"
    else:
        users = execute("""
                        SELECT * FROM users WHERE username = %s
                        """, (username,))
        if len(users) != 1:
            return "error logging in"
        if not pwd_context.verify(password + users[0]['salt'], users[0]['password']):
            return "error loggin in"
        
        session["user_id"] = users[0]["id"]
        
        return "succesful login"
@app.route('/login', methods=["GET", "POST"])
def login():
    
    session.pop("user_id", None)
    
    if request.method == "POST":
        
        if not request.form.get("username"):
            return render_template("login.html", error="Please enter a username")
        
        if not request.form.get("password"):
            return render_template("login.html", error="Must provide Password")
        
        username = request.form.get("username")
        provided_pass = request.form.get("password")
        
        users = execute("""
                        SELECT * FROM users WHERE username = %s
                        """, (username,))
        if len(users) != 1:
            return render_template("login.html", error="invalid username/password")
        if not pwd_context.verify(provided_pass + users[0]['salt'], users[0]['password']):
            return render_template("login.html", error="invalid username/password")
        
        session["user_id"] = users[0]["id"]
        print("user logged in succesfully")
        #print(username)
        if username == 'admin':
            session['admin'] = True
            return redirect( url_for("managedates") )
        
        return redirect( url_for("index") )
        
    return render_template("login.html")

@app.route('/logout', methods=["GET", "POST"])
def logout():
    
    session.pop("user_id", None)
    session.pop("admin", None)
    return redirect(url_for("index"))

@app.route('/register', methods=["GET", "POST"])
def register():
    
    session.pop("user_id", None)
    
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
        
        username = str(request.form.get("username"))
        email = str(request.form.get("email"))
        # check to see if username has already been added to database
        already_exists = execute("""
                                 SELECT * FROM users WHERE username = %s
                                 """, (username,))
        if len(already_exists) >= 1:
            return render_template("register.html", error="sorry username unavailable")
        
        hash_salt = get_salt(12)
        
        pass_hash = pwd_context.hash(request.form.get("password") + hash_salt)
        
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
        if username == 'admin':
            session['admin'] = True
            return redirect( url_for("managedates") )
        return redirect(url_for("index"))
    
    return render_template('register.html')

@app.route('/managedates', methods=["GET", "POST"])
def managedates():
    
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
                        all_dates[date] = {'sum' : '0', 'disabled' : 'true' }
                    else:
                        all_dates[date]['disabled'] = 'true'
            
            if 'enable' in request.form:
                for date in data:
                    if date in all_dates:
                        if all_dates[date]['sum'] == '0':
                            all_dates.pop(date, None)
                        else:
                            all_dates[date]['disabled'] = 'false'
        
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
    
    if "user_id" not in session:
        return redirect(url_for('login'))
    
    if "admin" not in session:
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

@app.route('/_get_menu')
def get_menu():
    menu = execute("""
                   SELECT * FROM menu WHERE row = %s
                   """,(MENU_VERSION,))[0]
    
    menu["entree"] = json.loads(menu.get("entree"))
    menu["sides"] = json.loads(menu.get("sides"))
    menu["minsize"] = str(menu.get("minsize"))
    
    return jsonify(menu)
# define route for flask to get favicon in static folder 
# will not work during development
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
    shutdown_server()
    return 'Server shutting down...'

if __name__ == '__main__':
    
        
    #set_disabled_dates()
    #print(all_dates)
    app.run(debug=False)
    #app.add_url_rule('/favicon.ico',
    #            redirect_to=url_for('static', filename='favicon.ico'))