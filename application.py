# -*- coding: utf-8 -*-
"""
Created on Thu Nov  8 16:12:38 2018

@author: jakez
"""
import os
import sys
from flask import Flask, flash, redirect, render_template, request, session, url_for, jsonify, send_from_directory
#from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user
from flask_session import Session
from flask_sqlalchemy import SQLAlchemy
from flask_jsglue import JSGlue
from config import getKeys


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
"""
app.config['TEMPLATES_AUTO_RELOAD'] = True
app.jinja_env.globals.update(classForButton=classForButton)
app.jinja_env.globals.update(isfree=isfree)
app.jinja_env.add_extension('jinja2.ext.loopcontrols')
"""
params = getKeys()
for key in params:
    os.environ[key] = params[key]

"""
#app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://%(user)s:\
#%(pw)s@%(host)s:%(port)s/%(db)s' % POSTGRES

#app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

app.jinja_env.add_extension('jinja2.ext.loopcontrols')
app.config["SESSION_FILE_DIR"] = mkdtemp()
app.config["SESSION_PERMANENT"] = False
app.secret_key = os.environ.get("SECRET_KEY", None)
app.config["SESSION_TYPE"] = "filesystem"

sess = Session()
sess.init_app(app)
"""
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/register', methods=["GET", "POST"])
def register():
    return render_template('register.html')
    
@app.route('/favicon.ico')
def favicon():
    return send_from_directory(os.path.join(app.root_path, 'static'),
                               'favicon.ico', mimetype='image/png')

if __name__ == '__main__':
    
    app.run(debug=True)
    #app.add_url_rule('/favicon.ico',
    #            redirect_to=url_for('static', filename='favicon.ico'))