# -*- coding: utf-8 -*-
"""
Created on Wed Nov 21 15:11:03 2018

@author: jakez
"""
import random
import json


def parse_dictionary(dictionaries):
    for item in dictionaries:
        dictionaries[item]['sum'] = int(dictionaries[item]['sum'])
        # final.append(item)
    return dictionaries


class App_Actions:

    def __init__(self, settings, random, traceback, MongoClient, datetime, pwd_context, string):
        self.CONFIRM_CODE_LENGTH = 8
        self.random = random
        self.MongoClient = MongoClient
        self.environ = settings
        self.datetime = datetime
        self.traceback = traceback
        self.pwd_context = pwd_context
        self.string = string

    def connect_db(self):
        clientString = self.environ.get('MONGO_STRING').format(self.environ.get(
            'MONGO_USER'), self.environ.get('MONGO_USER_PW'), 'retryWrites=true', 'w=majority')
        return self.MongoClient(clientString)

    def connect_to_db(self, method, kwargs=None):
        client = None
        return_value = {'status': False}
        try:
            client = self.connect_db()
            database = self.environ.get("DB_NAME")
            mydb = client[database]
            if kwargs:
                return_value['return_value'] = method(mydb, **kwargs)
            else:
                return_value['return_value'] = method(mydb)
            return_value['status'] = True

        except Exception as err:
            print(self.traceback.print_exc())
            error_collection = mydb[self.environ.get("ERROR_DB")]
            error_collection.insert_one(
                {'error': str(err), 'date/time': self.get_date_time()})
            return_value['error'] = str(err)
        finally:
            if client:
                client.close()
            return return_value

    def update_contact_info(self, mydb, confirmation_code, update_dict):
        collection = mydb[self.orders_db()]
        collection.find_one_and_update({"_id": confirmation_code},
                                       {"$set": update_dict}, upsert=False)

    def get_order_for_code(self, mydb, confirmation_code):
        collection = mydb[self.orders_db()]
        result = collection.find_one({"_id": confirmation_code})
        if not result:
            return []
        return result

    def get_all_orders(self, mydb):
        collection = mydb[self.orders_db()]
        result = collection.find({"_id": {"$not": {'$regex': "id_values"}}})
        return list(result)

    def get_user_orders(self, mydb, user_id):
        return_value = []
        user_confirmation_codes = self.get_user_confirmation_codes(
            mydb, user_id)

        collection = mydb[self.orders_db()]
        for confirmation_code in user_confirmation_codes:
            order_info = collection.find_one({'_id': confirmation_code})
            if not order_info:
                raise Exception("Could not find order information for confirmation code: {}".format(
                    confirmation_code))
            return_value.append(order_info)
        return return_value

    def get_user_confirmation_codes(self, mydb, user_id):
        collection = mydb[self.users_db()]
        result = collection.find_one({"_id": user_id})
        if not result:
            print('No user found with id: {}'.format(user_id))
            return []
        confirmation_codes = result.get("confirmation_codes")
        if not confirmation_codes:
            raise Exception("No confirmation codes found in user, user_id: {}. full user object: {}".format(
                str(user_id), str(result)))
        return confirmation_codes

    def generate_confirmation_code(self):
        code = self.connect_to_db(self.get_confirmation_code)
        return code.get("return_value")

    def get_confirmation_code(self, mydb):
        my_collection = mydb[self.orders_db()]
        new_code = self.get_code_string(self.CONFIRM_CODE_LENGTH)
        while self.is_code_already_used(my_collection, new_code):
            new_code = self.get_code_string(self.CONFIRM_CODE_LENGTH)
        return new_code

    def get_date_time(self):
        return self.datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    def get_code_string(self, length):
        return ''.join(["%s" % random.randint(0, 9) for num in range(0, length)])

    def is_code_already_used(self, my_collection, confirmation_code):
        result = my_collection.find_one({"_id": confirmation_code})
        if not result:
            return False
        if len(result) > 0:
            return True

    def initialize_collection(self, mydb, to_init):
        collection = mydb[to_init]
        collection.insert_one({'_id': 'id_values', 'sequence_value': 0})
        return collection.inserted_id

    def get_next_Value(self, collection, sequence_name, value):
        sequence = collection.find_one_and_update(
            {'_id': sequence_name}, {'$inc': {'sequence_value': value}})
        return sequence.get('sequence_value')

    def users_db(self):
        return self.environ.get("USERS_DB")

    def orders_db(self):
        return self.environ.get("ORDERS_DB")

    def password_recovery_db(self):
        return self.environ.get("PASSWORD_RECOVERY_DB")

    def entrees_db(self):
        return self.environ.get("ENTREES_DB")

    def sides_db(self):
        return self.environ.get("SIDES_DB")

    def settings_db(self):
        return self.environ.get("SETTINGS_DB")

    def manage_dates_db(self):
        return self.environ.get("MANAGE_DATES_DB")

    def error_db(self):
        return self.environ.get("ERROR_DB")

    def get_salt(self, N):
        return ''.join(self.random.SystemRandom().choice(self.string.ascii_lowercase +
                                                         self.string.ascii_uppercase + self.string.digits) for _ in range(N))

    def find_disabled_dates(self, mydb, all):
        return_arr = []
        # as a default value if function fails to retrieve max val
        max_day_val = 2000
        collection = mydb[self.manage_dates_db()]
        result = collection.find()

        for date_object in result:
            date_string = date_object.get("_id")
            if date_string == "max_day_sum":
                max_day_val = date_object.get("value")
                continue
            if self.is_date_passed(date_string):
                collection.remove_one({"_id": date_string})
            elif all:
                return_arr.append(date_object)
            elif date_object.get("disabled") == "True":
                return_arr.append(date_string)

        return (return_arr, max_day_val)

    def is_date_passed(self, date):
        date_in_records = self.datetime.datetime.strptime(date, '%d %B, %Y')
        return self.datetime.datetime.today() > date_in_records

    def get_disabled_dates(self, all=False):
        kwargs = {'all': all}
        return self.connect_to_db(self.find_disabled_dates, kwargs).get("return_value")

    def sort_list_of_dates(self, list_of_dates, default_key="_id", reverse=False):
        return sorted(list_of_dates, key=lambda x: self.datetime.datetime.strptime(
            x.get(default_key), '%d %B, %Y'), reverse=reverse)

    def disable_dates(self, mydb, dates):
        collection = mydb[self.manage_dates_db()]
        for date in dates:
            if collection.find({"_id": date}).count() > 0:
                collection.update_one({"_id": date}, {"$set": {
                    'disabled': "True"
                }})
            else:
                collection.insert_one(
                    {"_id": date, "sum": 0, "disabled": "True"})

    def enable_dates(self, mydb, dates):
        collection = mydb[self.manage_dates_db()]
        for date in dates:
            result = collection.find_one({"_id": date})
            if result and result.get("sum") == 0:
                collection.delete_one({"_id": date})
            else:
                collection.update_one({"_id": date}, {
                    '$set': {'disabled': "False"}
                }, upsert=False)

    def split_list_of_orders(self, list_of_orders, include_editable=False):
        errors = []
        past_dates = []
        future_dates = []
        for order in list_of_orders:

            order_date = order.get("date", None)
            if not order_date:
                errors.append(order)
                continue

            is_valid_date = self.validate_date(order_date)
            if not is_valid_date:
                errors.append(order)
                continue

            if include_editable:
                if self.user_can_edit(is_valid_date):
                    order['editable'] = True
                else:
                    order['editable'] = False

            is_date_passed = self.is_date_passed(order_date)
            if is_date_passed:
                past_dates.append(order)
            else:
                future_dates.append(order)

        return (past_dates, future_dates, errors)

    def validate_date(self, date_string):
        try:
            key = self.datetime.datetime.strptime(date_string, '%d %B, %Y')
            return key
        except:
            return False

    def user_can_edit(self, date_time_obj):
        return date_time_obj > self.datetime.datetime.today() + self.datetime.timedelta(hours=24)

    def change_user_pass(self, mydb, user_id, old_pass, new_pass):
        collection = mydb[self.users_db()]
        find_user = collection.find_one({'_id': user_id})
        if not find_user:
            return False
        if not self.verify_password(find_user, old_pass):
            return False
        hash_salt = find_user["salt"]
        encrypted = self.pwd_context.hash(new_pass + hash_salt)

        collection.find_one_and_update({'_id': user_id},
                                       {'$set': {"password": encrypted}}, upsert=False)
        return True

    def verify_password(self, user_object, password):
        return self.pwd_context.verify(password + user_object['salt'], user_object['password'])

    def login_user(self, mydb, username_or_email, password):
        collection = mydb[self.users_db()]
        find_user = collection.find_one({"$or":
                                         [{'username': username_or_email}, {"email": username_or_email}]})
        if not find_user:
            return False
        if not self.verify_password(find_user, password):
            return False
        return find_user.get("_id")

    def is_valid_password(self, password):
        return len(password) >= 8 or not any([x.isdigit() for x in password]) \
            or not any([x.isupper() for x in password]) or not any([x.islower() for x in password])

    def register_user(self, mydb, username, email, password):
        collection = mydb[self.users_db()]
        find_user = collection.find_one({"username": username})
        if find_user:
            return {'error': "User already exists with provided username."}
        find_user = collection.find_one({"email": email})
        if find_user:
            return {'error': 'User already exists with provided email.'}
        hash_salt = self.get_salt(12)
        encryption = self.pwd_context.hash(password + hash_salt)

        user_id = self.get_next_Value(collection, 'id_values', 1)
        user_obj = {'_id': user_id, 'username': username,
                    "email": email, "password": password, 'salt': hash_salt}
        user_obj['confirmation_codes'] = []
        result = collection.insert_one(user_obj)
        if result.inserted_id:
            return user_obj
        else:
            return {'error': "Something went wrong."}

    def validate_form(self, form):
        for key, value in form.items():
            if not key:
                return {"is_valid": False, "message": "Something went wrong, missing key."}
            if not value:
                return {"is_valid": False, "message": "Must provide {}".format(key)}
        if hasattr(form, "password") and hasattr(form, "confirm-password"):
            if form.get("password") != form.get("confirm-password"):
                return {'is_valid': False, "message": "Passwords did not match."}
