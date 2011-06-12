import memcache
import cPickle
import internals.constants


server = memcache.Client([internals.constants.memcached])

def set(name, input):
    server.set("loa_%s" % name,
               cPickle.dumps(input,
                             protocol=cPickle.HIGHEST_PROTOCOL))

def get(name):
    output = server.get("loa_%s" % name)
    if output is None:
        return None
    return cPickle.loads(output)
