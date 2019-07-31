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

    def __init__(self, settings, random, traceback, MongoClient,
                 datetime, pwd_context, string):
        self.CONFIRM_CODE_LENGTH = 8
        self.hash_salt_length = 12
        self.random = random
        self.MongoClient = MongoClient
        self.environ = settings
        self.datetime = datetime
        self.traceback = traceback
        self.pwd_context = pwd_context
        self.string = string

    def connect_db(self):
        clientString = self.environ.get('MONGO_STRING').format(
            self.environ.get('MONGO_USER'),
            self.environ.get('MONGO_USER_PW'),
            'retryWrites=true',
            'w=majority')
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
            self.log_error(str(err))
            return_value['error'] = str(err)
        finally:
            if client:
                client.close()
            return return_value

    def log_error(self, error):
        client = None
        try:
            client = self.connect_db()
            database = self.environ.get("DB_NAME")
            mydb = client[database]
            error_collection = mydb[self.environ.get("ERROR_DB")]
            error_collection.insert_one(
                {'error': str(error), 'date/time': self.get_date_time()})
        finally:
            if client:
                client.close()

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
                raise Exception(("Could not find order information " +
                                 "for confirmation code: {}").format(
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
            raise Exception(("No confirmation codes found in user, " +
                             "user_id: {}. full user object: {}").format(
                str(user_id),
                str(result))
            )
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
        return ''.join(["%s" % random.randint(0, 9)
                        for num
                        in range(0, length)])

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

    def menu_db(self):
        return self.environ.get("MENU_DB")

    def settings_db(self):
        return self.environ.get("SETTINGS_DB")

    def manage_dates_db(self):
        return self.environ.get("MANAGE_DATES_DB")
        return self.environ.get("ERROR_DB")

    def get_salt(self, N):
        return ''.join(self.random.SystemRandom()
                       .choice(self.string.ascii_lowercase +
                               self.string.ascii_uppercase +
                               self.string.digits) for _ in range(N))

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
        return self.connect_to_db(self.find_disabled_dates,
                                  kwargs).get("return_value")

    def sort_list_of_dates(self, list_of_dates, default_key="_id",
                           reverse=False):
        return sorted(list_of_dates,
                      key=lambda x: self.datetime.datetime.strptime(
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
        return date_time_obj > (self.datetime.datetime.today() +
                                self.datetime.timedelta(hours=24))

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
                                       {'$set': {"password": encrypted}},
                                       upsert=False)
        return True

    def verify_password(self, user_object, password):
        return self.pwd_context.verify(password + user_object['salt'],
                                       user_object['password'])

    def login_user(self, mydb, username_or_email, password):
        collection = mydb[self.users_db()]
        find_user = collection.find_one({"$or":
                                         [{'username': username_or_email},
                                          {"email": username_or_email}]
                                         })
        if not find_user:
            return False
        if not self.verify_password(find_user, password):
            return False
        return find_user.get("_id")

    def is_valid_password(self, password):
        return (len(password) >= 8 or
                not any([x.isdigit() for x in password]) or
                not any([x.isupper() for x in password]) or
                not any([x.islower() for x in password]))

    def register_user(self, mydb, username, email, password):
        collection = mydb[self.users_db()]
        find_user = collection.find_one({"username": username})
        if find_user:
            return {'error': "User already exists with provided username."}
        find_user = collection.find_one({"email": email})
        if find_user:
            return {'error': 'User already exists with provided email.'}
        hash_salt = self.get_salt(self.hash_salt_length)
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
                return {"is_valid": False, "message":
                        "Something went wrong, missing key."}
            if not value:
                return {"is_valid": False, "message":
                        "Must provide {}".format(key)}

        if hasattr(form, "password") and hasattr(form, "confirm-password"):
            if form.get("password") != form.get("confirm-password"):
                return {'is_valid': False,
                        "message": "Passwords did not match."}

    def user_exists(self, mydb, email):
        collection = mydb[self.users_db()]
        find_user = collection.find_one({"email": email})
        if find_user:
            return True
        return False

    def get_new_pass_link(self, email):
        hash_code = self.get_salt(45)
        return ('https://taco-lindo-catering.herokuapp.com' +
                '/password_recovery?code={}&recipient={}'.format(hash_code,
                                                                 email),
                hash_code)

    def add_pass_recovery(self, mydb, email, code):
        collection = mydb[self.password_recovery_db()]

        reset_password_obj = {'_id': email}
        collection.find_one_and_delete(reset_password_obj)

        reset_password_obj['code'] = code
        reset_password_obj['timestamp'] = self.get_date_time()

        result = collection.insert_one(reset_password_obj)
        if result.inserted_id == email:
            return True
        return False

    def check_password_recovery(self, mydb, code, email):
        collection = mydb[self.password_recovery_db()]
        find_email = collection.find_one({'_id': email})
        if not find_email:
            return False
        if find_email.get("code") != code:
            return False
        return find_email.get("timestamp")

    def is_timestamp_within_24hr(self, timestamp):
        request_datetime = self.datetime.datetime.strptime(
            timestamp, '%Y-%m-%d %H:%M:%S')
        request_plus24hr = self.datetime.timedelta(hours=24) + request_datetime
        return request_plus24hr > self.datetime.datetime.now()

    def update_user_password(self, mydb, email, new_pass):
        collection = mydb[self.users_db()]
        confirm_user = collection.find_one({"email": email})
        if not confirm_user:
            return False
        hash_salt = self.get_salt(self.hash_salt_length)
        pass_hash = self.pwd_context.hash(new_pass + hash_salt)
        update_dictionary = {"password": pass_hash, "salt": hash_salt}
        collection.find_one_and_update({'email': email}, {
            '$set': update_dictionary}, upsert=False)
        return confirm_user

    def set_order_special_note(self, mydb, orderId, note):
        collection = mydb[self.orders_db()]
        if note == "":
            collection.find_one_and_update({"_id": orderId}, {
                "$unset": {'special-note': 1}
            })
        else:
            collection.find_one_and_update({"_id": orderId}, {
                "$set": {"special-note": note}
            }, upsert=True)

    def get_menu_items(self, mydb):
        collection = mydb[self.menu_db()]
        result = collection.find()
        return list(result)

    def update_menu_to_db(self, mydb, list_of_menu):
        collection = mydb[self.menu_db()]
        collection.delete_many({})
        for menu_item in list_of_menu:
            collection.insert_one(menu_item)

    def parse_menu_prices(self, mydb):
        return_obj = {}
        collection = mydb[self.menu_db()]
        results = collection.find()

        for result in results:
            name = result.get('name')
            # print(str(result) + " - parsing this time now.")
            item_obj = {}
            sizes = self.find_key_value(
                result, ["size", "sizes", "portion", "portion"])
            if not sizes:
                error_message = ("helpers.py line 402. " +
                                 "Could not get sizes for item: {}")
                raise Exception(error_message.format(name))
            # print(sizes)
            for size in sizes:
                # print("\n size : " + str(size) + "\n")
                values = list(size.values())
                # print(values)
                if len(values) == 2:
                    item_obj.update({values[0].strip(): values[1].strip()})
                else:
                    item_obj.update(size)
            flavors = self.find_key_value(result,
                                          ["flavors", "flavor",
                                           'protein', "meat"])
            if flavors:
                for flavor in flavors:
                    item_obj.update({
                        flavor.get("name").strip():
                        self.find_key_value(flavor,
                                            ["Price", "Count",
                                             "price", "count"]).strip()
                    })
            return_obj[name] = item_obj
        return return_obj

    def find_key_value(self, dictionary, arrayOfKeys):
        while arrayOfKeys:
            key = arrayOfKeys.pop(0)
            if dictionary.get(key):
                return dictionary[key]

        return False

    def validate_order(self, array_of_order, prices_dictionary):
        total = 0.00
        array_of_order = json.loads(array_of_order)

        for index, order_item in enumerate(array_of_order):
            item_cost = self.price_item(order_item, prices_dictionary)
            if not item_cost:
                return (None, None)
            total = total + item_cost
            order_item['cost'] = item_cost
            array_of_order[index] = order_item
        return (total, array_of_order)

    def price_item(self, order_item, prices_dictionary):
        base_cost = 1.00
        item_name = order_item.get('name')
        if not item_name:
            return False
        flavor = self.find_key_value(
            order_item, ["flavors", "flavor", 'protein', "meat"])
        if flavor:
            base_cost = base_cost * float(prices_dictionary[item_name][flavor])
        size = self.find_key_value(
            order_item, ["size", "sizes", "portion", "portion"]
        )
        if size:
            base_cost = base_cost * float(prices_dictionary[item_name][size])
        else:
            return False
        return float(base_cost * order_item['count'])

    def format_amount_to_cents(self, original_amount):
        if type(original_amount) == 'string':
            original_amount = float(original_amount)
        original_amount *= 100
        return int(original_amount)

    def reconcile_managedates(self, mydb, date, order_total):
        collection = mydb[self.manage_dates_db()]
        max_val = collection.find_one({'_id': "max_day_sum"})
        if not max_val:
            max_val = 2000
        else:
            max_val = max_val.get('value')
        date_is_in_db = collection.find_one({"_id": date})

        if not date_is_in_db:
            disabled = order_total >= max_val
            new_obj = {'_id': date,
                       'sum': order_total,
                       'disabled': str(disabled)}
            collection.insert_one(new_obj)
            return True
        new_sum = date_is_in_db.get("sum") + order_total
        disabled = new_sum >= max_val
        collection.find_one_and_update({"_id": date},
                                       {"$set": {'sum': new_sum,
                                                 "disabled": str(disabled)}})
        return True

    def add_confirmation_code_to_user(self, mydb, user_id, confirmation_code):
        collection = mydb[self.users_db()]
        collection.update_one({"_id": user_id},
                              {'$push':
                               {"confirmation_codes": confirmation_code}})
        return True

    def add_order_to_db(self, mydb, order):
        collection = mydb[self.orders_db()]
        collection.insert_one(order)
        return True

    def validate_user_placed_confirmation_code(self, user_id,
                                               confirmation_code):
        kwargs = {"user_id": user_id}
        list_of_codes = self.connect_to_db(
            self.get_user_confirmation_codes, kwargs)
        if not list_of_codes.get("status"):
            return False
        list_of_codes = list_of_codes.get("return_value")
        if confirmation_code in list_of_codes:
            return True
        else:
            return False

    def get_user_confirmation_codes(self, mydb, user_id):
        collection = mydb[self.users_db()]
        find_user = collection.find_one({"_id": user_id})
        if not find_user:
            return []
        else:
            return find_user.get("confirmation_codes")
