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

##############################################################################
###################### function that sorts managedates table by date  ######## 
def sort_managedates():
    
    dates_json = execute("""SELECT * FROM managedates WHERE row = 1""",("NA",))[0].get("dates")
    dates = json.loads(dates_json)
 
    all_dates = [date.get('day') for date in dates]
    
    date_keys = dict( ( dates[index]['day'], index) for index in range( len(dates) ) )
    sort_dates = sorted(all_dates, key=lambda x: datetime.datetime.strptime(x, '%d %B, %Y'))
    
    final_sorted = []

    for date in sort_dates:
        final_sorted.append(dates[date_keys[date]])
         
    final_sorted = json.dumps(final_sorted)
    
    if dates_json != final_sorted:
        execute("""UPDATE managedates SET dates = %s WHERE row = 1""",(final_sorted,))
    else:
        print("already sorted")

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
    dates = execute("""
                    SELECT * FROM managedates WHERE row = 1
                    """,("NA",))
    max_val = dates[0].get("max")
    calender = json.loads(dates[0]["dates"])
#    print(calender)
    final = []
    for date in calender:
        if int(date.get("sum")) == 0 or int(date.get("sum")) >= max_val:
            final.append(date.get("day"))
    return render_template('index.html', dates=final)

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
    
    sort_managedates()
    
    dates = execute("""
                    SELECT * FROM managedates
                    """, "NA")
    
    all_dates = json.loads(dates[0].get("dates"))
    
    max_val = dates[0].get("max")
    
    # must convert sum - string to sum - integer for each date
    dates = parse_dictionary(all_dates)
 
    if request.method == "POST":
        
        data = request.form.get("data")
        data = data.split("/")
        
        for date in data:
            dates.append({ "day": str(date), "sum": "0"})
            
        dates_to_add = json.dumps(dates)
        
        execute("""
                UPDATE managedates SET dates = %s WHERE row = 1
                """,(dates_to_add, ))
        
        return redirect(url_for("managedates"))
    
    return render_template("managedates.html", dates = dates, admin=True, maximum = max_val)

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
                
            insert_menu = json.dumps(set_menu)    
            
            execute("""
                    UPDATE menu SET entree = %s WHERE row = 1
                    """,(insert_menu, ))
            
        elif 'submit-sides' in request.form:
            
            columns = request.form.get("submit-sides").split(",")
            
            for side in range( int( len(request.form)/len(columns) ) ):
                
                item_num = str(side)
                item_dict = {}
                for column in columns:
                    item_dict[column] = request.form.get("sides" + item_num + column)
                
                set_menu.append(item_dict)
                
            insert_menu = json.dumps(set_menu)
            
            execute("""
                    UPDATE menu SET sides = %s WHERE row = 1
                    """, (insert_menu,) )
            
        return redirect(url_for('menusetter'))
#############################################################################
    full_menu = execute("""
                        SELECT * FROM menu WHERE row = 1
                        """,("NA",))[0]
    
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
    
    return render_template("menusetter.html", admin=True, 
                                           entreeMenu = entree_items,
                                           sidesMenu = side_items)

# define route for flask to get favicon in static folder 
# will not work during development
@app.route('/favicon.ico')
def favicon():
    return send_from_directory(os.path.join(app.root_path, 'static'),
                               'favicon.ico', mimetype='image/png')

if __name__ == '__main__':

        #print(all_dates)
    app.run(debug=False)
    #app.add_url_rule('/favicon.ico',
    #            redirect_to=url_for('static', filename='favicon.ico'))