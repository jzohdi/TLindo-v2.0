# -*- coding: utf-8 -*-
"""
Created on Thu Nov  8 16:16:09 2018

@author: jakez
"""
def getKeys():
    try:
        dotenv = '.env.ini'
    except:
        print('env file not found' )
        
    with open(dotenv, 'r') as file:
        content = file.readlines()
    
    content = [line.strip().split('=') for line in content if '=' in line]
    env_vars = dict(content)
    if file:
        file.close()
    return env_vars
#    os.environ.update({"SECRET_KEY" : })