# -*- coding: utf-8 -*-
class App_Actions_Response:
    def __init__(self, status, response):
        self.status = status
        self.return_value = response

    def did_succeed(self):
        return self.status

    def get_value(self):
        return self.return_value
