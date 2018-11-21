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

app = Flask(__name__)
#app.static_folder = 'static'

jsglue = JSGlue(app)

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
settings = {}

params = getKeys()
for key in params:
    
    settings[key] = params[key]

db = SQLAlchemy(app)

"""
#app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://%(user)s:\
#%(pw)s@%(host)s:%(port)s/%(db)s' % POSTGRES

#app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

app.config["SESSION_FILE_DIR"] = mkdtemp()

app.secret_key = os.environ.get("SECRET_KEY", None)
app.config["SESSION_TYPE"] = "filesystem"

sess = Session()
sess.init_app(app)
"""
app.jinja_env.add_extension('jinja2.ext.loopcontrols')
app.config["SESSION_PERMANENT"] = False
app.secret_key = settings.get("SECRET_KEY", None);

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
#print( POSTGRES )
#print( params )

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
        cur.execute( statement, values )
        #conn.commit()
        res = [json.loads(json.dumps(dict(record))) for record in cur]
        
    except:
        print("connot select users")
    finally:
        if conn:
            if cur:
                cur.close()
            conn.close()
    return res
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

@app.route('/register', methods=["GET", "POST"])
def register():
    
    session.pop("user_id", None)
    if request.method == "POST":
        
        if not request.gorm.get("username"):
            
    return render_template('register.html')
    
@app.route('/favicon.ico')
def favicon():
    return send_from_directory(os.path.join(app.root_path, 'static'),
                               'favicon.ico', mimetype='image/png')

if __name__ == '__main__':
    
    app.run(debug=True)
    #app.add_url_rule('/favicon.ico',
    #            redirect_to=url_for('static', filename='favicon.ico'))