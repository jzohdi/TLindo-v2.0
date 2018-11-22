# -*- coding: utf-8 -*-
"""
Created on Thu Nov  8 16:12:38 2018

@author: jakez
"""
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
from helpers import get_salt

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
            cur.execute( statement, values )
        #conn.commit()
            res = [json.loads(json.dumps(dict(record))) for record in cur]
            print(res)
        if "INSERT" in statement or "UPDATE" in statement:
            cur.execute( statement, values )
            conn.commit()
            res = cur.statusmessage
        return res
    except:
        print("connot select users")
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
app.config["SESSION_PERMANENT"] = False

secret_Key = settings.get("SECRET_KEY")

app.secret_key = secret_Key

app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://%(user)s:\
%(pw)s@%(host)s:%(port)s/%(db)s' % POSTGRES

app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

app.config["SESSION_TYPE"] = "filesystem"

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
    return render_template('index.html')

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
        
        return redirect( url_for("index") )
        
    return render_template("login.html")

@app.route('/logout', methods=["GET", "POST"])
def logout():
    
    session.pop("user_id", None)
    
    return render_template("index.html")

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
        print(result)
        
        confirm_user_added = execute("""
                              SELECT * FROM users WHERE username = %s
                              """,(username,))
        print(confirm_user_added)
    
        user_id_num = confirm_user_added[0]["id"]
        
        session["user_id"] = user_id_num
        
        
        return redirect(url_for("index"))
    
    return render_template('register.html')
    
@app.route('/favicon.ico')
def favicon():
    return send_from_directory(os.path.join(app.root_path, 'static'),
                               'favicon.ico', mimetype='image/png')

if __name__ == '__main__':

    app.run(debug=True)
    #app.add_url_rule('/favicon.ico',
    #            redirect_to=url_for('static', filename='favicon.ico'))