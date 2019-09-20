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
    # print(response)
    # check inbox


if __name__ == "__main__":
    methods = [test_connection, test_send_email]
    for method in methods:
        method()
    # Controllers.connect_to_db(initalize_collections)
