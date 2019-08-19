class Email_Service:
    def __init__(self, settings, Thread, requests):
        self.environ = settings
        self.Thread = Thread
        self.requests = requests
        self.recovery_uri = "password_recovery"
        self.order_placed_uri = "order_placed"
        self.sign_up_uri = "sign_up"
        self.other_uri = "general"

    def send_password_recovery(self, recipient, link):
        ENDPOINT = self.environ.get(
            "EMAIL_SERVER_BASE_URI") + self.recovery_uri
        AUTH = self.environ.get("AUTH")
        data = {"AUTH": AUTH, "recipient": recipient, "link": link}
        result = self.requests.get(ENDPOINT, data=data)
        return result.json()

    def thank_for_sign_up(self, recipient, username):
        ENDPOINT = self.environ.get("EMAIL_SERVER_BASE_URI") + self.sign_up_uri
        AUTH = self.environ.get("AUTH")
        data = {"AUTH": AUTH, 'recipient': recipient, "user_name": username}
        result = self.requests.get(ENDPOINT, data=data)
        # print(result.json())
        return result.json()

    def placed_order_email(self, recipient, order, confirmation_code):
        ENPOINT = self.environ.get(
            "EMAIL_SERVER_BASE_URI") + self.order_placed_uri
        AUTH = self.environ.get("AUTH")
        str_order = self.prettify(order)
        data = {"AUTH": AUTH, "recipient": recipient,
                'order': str_order, 'confirmation_code': confirmation_code}
        result = self.requests.get(ENPOINT, data=data)
        return result.json()

    def prettify(self, order_dict):
        final_string = "\n"
        for key, value in order_dict.items():
            final_string = final_string + key + ": " + str(value) + "\n"
        return final_string


class GSpread:
    def __init__(self, gspread, SAC):
        self.gspread = gspread
        self.SAC = SAC
        self.scope = ["https://spreadsheets.google.com/feeds",
                      'https://www.googleapis.com/auth/spreadsheets',
                      "https://www.googleapis.com/auth/drive.file",
                      "https://www.googleapis.com/auth/drive"]
        self.client = gspread.authorize(
            SAC.from_json_keyfile_name("credentials.json", self.scope))
        self.title = "Taco Lindo Menu"
        self.single_value_keys = {"name", "type"}
        self.to_map = {'sizes', 'flavors', 'size', 'flavor', 'protein', 'meat'}
        self.strict = ("name", "type")

    def read_menu(self):
        all_items_parsed = []
        sheet = self.client.open(self.title)
        sheets = sheet.worksheets()
        new_id = 0  # Get a list of all records
        for sheet in sheets:
            title = sheet.title.lower()
            if "example" not in title:
                sheet_name = sheet.title

                all_item_values = sheet.get_all_values()
                all_items_parsed.append(
                    self.parse_sheet_for_item(new_id,
                                              all_item_values,
                                              sheet_name))
                new_id = new_id + 1
        return all_items_parsed

    def parse_sheet_for_item(self, new_id, all_item_values, sheet_name):
        item_to_add = {"_id": new_id}
        all_keys = all_item_values.pop(0)
        inverse_arrays = [[key] for key in all_keys]

        for values in all_item_values:
            for index, value in enumerate(values):
                if value == "":
                    continue
                inverse_arrays[index].append(value)
        skip = False

        for values_index, value in enumerate(inverse_arrays):
            if skip:
                skip = False
                continue
            title = value[0].lower()

            if title in self.single_value_keys:
                if len(value) < 2:
                    item_to_add[title] = ""
                elif len(value) == 2:
                    item_to_add[title] = str(value[1])
                else:
                    item_to_add[title] = ' '.join(value)

            elif title in self.to_map:
                item_to_add[title] = self.parse_mapped_values(
                    value, inverse_arrays[values_index + 1])
                skip = True
            else:
                item_to_add[title] = value[1:]
        is_valid_item = self.validate_item(item_to_add)
        if not is_valid_item.get("Status"):
            return {"Error":
                    is_valid_item.get("Message").replace(
                        "sheet_name", sheet_name)}
        return item_to_add

    def parse_mapped_values(self, array_one, array_two):
        title = array_one.pop(0)
        map_title = array_two.pop(0)
        mappings = []

        if len(array_one) != len(array_two):
            raise Exception(
                "missing values in mapping {} : {}".format(title, map_title))
        arrays_len = len(array_one)
        keys = ("name", map_title)
        zipped_array = [[array_one[index], array_two[index]]
                        for index in range(arrays_len)]

        for values in zipped_array:
            new_map_obj = {keys[0]: values[0], keys[1]: values[1]}
            # new_map_obj = {values[0]: values[1]}
            mappings.append(new_map_obj)
        return mappings

    def validate_item(self, item_obj):
        for title in self.strict:
            if title not in item_obj or item_obj[title] == "":
                return {"Status": False, "Message": (
                    "Error parsing sheet: sheet_name, " +
                    "missing one or more fields: " + str(self.strict))}
        return {"Status": True}
