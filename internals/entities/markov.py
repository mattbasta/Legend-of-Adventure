"""
Markov Bot 2.0
Responds to the last word of the previous statement, generating a new statement.
Author: Katie Bell (katharos.id.au)
Use: Use this for whatever you like, just don't claim it as your own if it's not.
"""

import random
import collections
import string


START = "<<START>>"
END = "<<END>>"
GAP = "<<GAP>>"

###DEBUG = True
DEBUG = False

def tokenise(s):
    # use James' tokeniser
    for p in "!\"#$%()*+,-./:;<=>?@[\]^_`{|}~":
        s = s.replace(p, " "+p)
    toks = s.split()
    return toks

def detokenise(s):
    txt = " ".join(s)
    for p in string.punctuation:
        txt = txt.replace(" "+p, p)
    return txt

def recursivedict_factory(depth):
    if depth > 0:
        return lambda: collections.defaultdict(recursivedict_factory(depth-1))
    else:
        return int

class MarkovBot(object):
    def __init__(self):
        self.markov = recursivedict_factory(3)()
        self.markov2 = recursivedict_factory(2)()
        self.markov3 = recursivedict_factory(1)()
        self.wordcount = 0

    def addToks(self, toks):
        if DEBUG:
            print "adding toks:", toks
        self.markov2[toks[0]][toks[1]] += 1
        self.markov3[toks[0]] += 2
        self.wordcount += 2
        for (i, tok) in enumerate(toks[2:]):
            i += 2
            self.markov[toks[i-2]][toks[i-1]][toks[i]] += 1
            self.markov2[toks[i-1]][toks[i]] += 1
            self.markov3[toks[i]] += 1
            self.wordcount += 1



    def addRespond(self, statement, response):
        sta = [GAP] + tokenise(statement)
        while len(sta) > 1 and len(sta[-1]) < 2:
            sta.pop(-1)
        res = tokenise(response)
        toks = [START +sta[-1]] + [GAP] + res + [GAP]
        self.addToks(toks)

    def addLine(self, line):
        toks = tokenise(line.strip())
        self.addToks(toks)

    def readConvoFile(self, filename):
        f = open(filename, 'rU')
        cur = ""
        for line in f:
            self.addRespond(cur, line)
            cur = line

    def readFile(self, filename, lines=True):
        f = open(filename, 'rU')
        if lines:
            for line in f:
                self.addLine(line)
        else:
            txt = f.read()
            # tokenise based on sentences

    def getwordlist(self, start):
        words = start
        gapcount = 1
        while words[-1] != END and gapcount < 2:
            if words[-2] in self.markov and words[-1] in self.markov[words[-2]]:
                dicti = self.markov[words[-2]][words[-1]]
                total = self.markov2[words[-2]][words[-1]]
            elif words[-1] in self.markov2:
                dicti = self.markov2[words[-1]]
                total = self.markov3[words[-1]]
            else:
                dicti = self.markov3
                total = self.wordcount
            r = random.randint(0, total)
            x = -1
            for key in dicti:
                x += dicti[key]
                if x >= r:
                    words.append(key)
                    break
            if words[-1] == GAP and len(words) > 2:
                gapcount += 1
###     while START in words[2:-1]:
###         i = words[2:-1].index(START)
###         words.pop(i+2)
        return words

    def respond(self, txt):
        toks = tokenise(txt)
        while len(toks) > 1 and len(toks[-1]) < 2:
            toks.pop(-1)
        toks = [GAP] + toks
        toks = [START+toks[-1]] + [GAP]
        if DEBUG:
            print "Looking up:", toks[-2:]
        words = self.getwordlist(toks[-2:])
        if DEBUG:
            print "Found:", words
        return detokenise(words[2:-1])

    def generate(self):
        words = self.getwordlist([GAP, GAP])
        return detokenise(words[2:-1])

    def __str__(self):
        res = str(self.markov3)
        res += '\n'
        res += str(self.markov2)
        res += '\n'
        res += str(self.markov)
        return res


