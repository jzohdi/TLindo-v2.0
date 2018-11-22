# -*- coding: utf-8 -*-
"""
Created on Wed Nov 21 15:11:03 2018

@author: jakez
"""
import string 
import random

def get_salt(N):
    return ''.join(random.SystemRandom().choice(string.ascii_lowercase + 
                   string.ascii_uppercase + string.digits) for _ in range(N))
