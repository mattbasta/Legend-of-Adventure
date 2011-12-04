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
    tokens = s.split()
    return tokens

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
    """
    This is a mixin of sorts that adds chatbot properties to an entity. In
    general, it should be used with NPCs, though it could likely be used with
    any kind of entity.
    """

    def __init__(self):
        # Make sure we initialize whatever the parent class is, if there is
        # one.
        super(MarkovBot, self).__init__()

        # Define all of the data stores.
        self.markov = recursivedict_factory(3)()
        self.markov2 = recursivedict_factory(2)()
        self.markov3 = recursivedict_factory(1)()

        self._word_count = 0

        self.disable_chatbot = False

    def _add_tokens(self, tokens):
        if DEBUG:
            print "adding tokens:", tokens
        self.markov2[tokens[0]][tokens[1]] += 1
        self.markov3[tokens[0]] += 2
        self._word_count += 2
        for (i, tok) in enumerate(tokens[2:]):
            i += 2
            self.markov[tokens[i-2]][tokens[i-1]][tokens[i]] += 1
            self.markov2[tokens[i-1]][tokens[i]] += 1
            self.markov3[tokens[i]] += 1
            self._word_count += 1

    def train_response(self, statement, response):
        sta = [GAP] + tokenise(statement)
        while len(sta) > 1 and len(sta[-1]) < 2:
            sta.pop(-1)
        res = tokenise(response)
        tokens = [START +sta[-1]] + [GAP] + res + [GAP]
        self._add_tokens(tokens)

    def addLine(self, line):
        tokens = tokenise(line.strip())
        self._add_tokens(tokens)

    def _get_word_list(self, start):
        if not any((self.markov, self.markov2, self.markov3)):
            return start
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
                total = self._word_count
            r = random.randint(0, total)
            x = -1
            for key in dicti:
                x += dicti[key]
                if x >= r:
                    words.append(key)
                    break
            if words[-1] == GAP and len(words) > 2:
                gapcount += 1
        return words

    def response(self, text):
        tokens = tokenise(text)
        while len(tokens) > 1 and len(tokens[-1]) < 2:
            tokens.pop(-1)
        tokens = [GAP] + tokens
        tokens = [START+tokens[-1]] + [GAP]
        if DEBUG:
            print "Looking up:", tokens[-2:]
        words = self._get_word_list(tokens[-2:])
        if DEBUG:
            print "Found:", words
        return detokenise(words[2:-1])

    def __str__(self):
        return "%s\n%s\n%s" % map(str, (self.markov3,
                                        self.markov2,
                                        self.markov))


