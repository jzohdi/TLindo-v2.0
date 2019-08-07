
def getKeys(os):
    try:
        dotenv = '.env.ini'
        with open(dotenv, 'r') as file:
            content = file.readlines()

        content = [line.strip().split('=') for line in content if '=' in line]
        env_vars = dict(content)
        if file:
            file.close()
        return env_vars
    except:
        new_obj = {}
        environment = [
            'BETA_KEY', 'DATABASE_URL', 'DB',
            'EMAIL_ADDRESS', 'HOST', 'PASSWORD',
            'PORT', 'PW', 'SHUTDOWN', 'STRIPE_KEY', 'USER', 'SECRET_KEY']
        for variable in environment:
            new_obj[variable] = os.environ.get(variable)
        return new_obj
