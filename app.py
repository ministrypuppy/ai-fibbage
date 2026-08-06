import random
from flask import Flask, jsonify

app = Flask(__name__)

# Massively expanded Fibbage question bank (Adult-oriented, non-raunchy, answers <= 20 chars)
MASTER_FIBBAGE_LIBRARY = [
    {"q": "A disgruntled employee filled office ventilation ducts with what scented item?", "a": "Liquid ass"},
    {"q": "In 2012, a man tried to smuggle 18 rare-breed iguanas through customs inside what clothing item?", "a": "Compression shorts"},
    {"q": "What unexpected household object caused a mass evacuation at a German airport in 2018?", "a": "A frozen turkey"},
    {"q": "A Florida man attempted to rob a convenience store wielding a live what?", "a": "Alligator"},
    {"q": "What weird item was found duct-taped to the undercarriage of a stolen police cruiser?", "a": "A dildo"},
    {"q": "In 1995, a casino robber used what household liquid to blind the security cameras?", "a": "Lemon juice"},
    {"q": "A bizarre 18th-century medical fad involved blowing what substance up patients' rectums?", "a": "Tobacco smoke"},
    {"q": "What unusual item did prison inmates use to successfully scale a 20-foot wall?", "a": "Dental floss"},
    {"q": "A museum in Iceland famously displays a collection of preserved specimens from various what?", "a": "Mammals"},
    {"q": "What strange contraband was intercepted at a maximum-security prison hidden inside a hollowed-out Bible?", "a": "A smartphone"},
    {"q": "In 2004, a man drove a heavily modified bulldozer through a Colorado town destroying what?", "a": "Town hall"},
    {"q": "What peculiar object did archaeologists find buried alongside an ancient Viking warrior?", "a": "Board game"},
    {"q": "A burglar fell asleep on a couch and woke up to police holding what snack?", "a": "Bag of chips"},
    {"q": "What unusual livestock was used by a city park department to mow hard-to-reach hillsides?", "a": "Goats"},
    {"q": "In an attempt to escape police, a suspect jumped into a enclosure housing what zoo animal?", "a": "Polar bear"},
    {"q": "What weird item was reported stolen from a high-end Chicago art gallery?", "a": "A golden toilet"},
    {"q": "A man was arrested for trying to pay his restaurant tab with what counterfeit currency?", "a": "Million bill"},
    {"q": "What household appliance did a clever thief use to break into a locked jewelry display?", "a": "Blowtorch"},
    {"q": "An eccentric billionaire built a full-scale replica of what famous ship out of concrete?", "a": "Titanic"},
    {"q": "What strange item did border patrol agents find hidden inside a shipment of frozen fish?", "a": "Cocaine bricks"}
]

def enforce_length(questions):
    """Validates that all answers strictly respect the 20-character limit."""
    valid = []
    for item in questions:
        if len(item["a"]) <= 20:
            valid.append(item)
        else:
            # Automatically truncate or clean if an outlier slips through
            valid.append({"q": item["q"], "a": item["a"][:20].strip()})
    return valid

@app.route('/api/fibbage/infinite', methods=['GET'])
def get_infinite_questions():
    cleaned_pool = enforce_length(MASTER_FIBBAGE_LIBRARY)
    # Pulls a randomized batch of 10 unique questions every time the endpoint is hit
    batch = random.sample(cleaned_pool, min(len(cleaned_pool), 10))
    return jsonify(batch)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)