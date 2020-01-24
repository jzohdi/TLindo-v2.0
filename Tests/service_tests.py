import random
import traceback
from pymongo import MongoClient
import datetime
from passlib.apps import custom_app_context as pwd_context
import string
import os
import sys
import re

import requests
from threading import Thread
# now directed at parent directory
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import getKeys
from helpers import App_Actions
from services import Email_Service

settings = getKeys(os)

App_Actions_dependencies = {'random': random}
App_Actions_dependencies['traceback'] = traceback
App_Actions_dependencies['MongoClient'] = MongoClient
App_Actions_dependencies['datetime'] = datetime
App_Actions_dependencies['pwd_context'] = pwd_context
App_Actions_dependencies['string'] = string
App_Actions_dependencies["re"] = re
Controllers = App_Actions(settings, **App_Actions_dependencies)

Email_Service_dependencies = {'Thread': Thread}
Email_Service_dependencies["requests"] = requests
Email_Service = Email_Service(settings, **Email_Service_dependencies)


def test_connection():
    client = Controllers.connect_db()
    assert client


def initalize_collections(mydb):
    to_init = [{"name": "all_orders", "obj": {"_id": "id_values", "sequence_value": 0}},
               {"name": "users", "obj": {"_id": "id_values", "sequence_value": 0}},
               {"name": "manage_dates", "obj": {"_id": "max_day_sum", "value": 2000}}]
    for collection_to_init in to_init:
        collection = mydb[collection_to_init["name"]]

        search_q = {"_id": collection_to_init['obj']['_id']}
        already_init = collection.find_one(search_q)
        if not already_init:
            collection.insert_one(collection_to_init['obj'])


def test_send_email():
    email = "taco.lindo.catering@gmail.com"
    username = "admin"
    response = Email_Service.thank_for_sign_up(email, username)


def test_changed_email():
    email = "jakez1@live.com"
    response = Email_Service.notify_changed_email(email)


def test_changed_password():
    email = "jzohdi@gmail.com"
    resonse = Email_Service.notify_changed_password(email)

# this is to test how a date is added into the database
# wanted is for the date to be stored as a data object or isodate
# so that mongo $gt, or $lt operations can be used.


def insert_date(mydb):
    example_date = "30 November, 2019"
    iso = datetime.datetime.strptime(
        example_date, "%d %B, %Y")
    mydb["all_orders"].insert_one({"_id": "date", "datetime": iso})


def test_pretty_order():
    order_list = [
        {"count": 2,
         'name': "Taco Tray",
         "type": "Entree",
         "flavor": "Ground Beef",
         "size": "Shallow Half Pan(24 Tacos)",
         "tortilla": "Soft Shell", "cost": 108.0},
        {"count": 2,
         'name': "Taco Tray",
         "type": "Entree",
         "flavor": "Shredded Chicken",
         "size": "Shallow Half Pan(24 Tacos)",
         "tortilla": "Soft Shell", "cost": 108.0}]
    pretty = Email_Service.prettify_order(order_list)
    print(pretty)


# Controllers.connect_to_db(insert_date)
# Controllers.connect_to_db(initalize_collections)
if __name__ == "__main__":

     # test_changed_email()

    test_changed_password()

    # test_pretty_order()
