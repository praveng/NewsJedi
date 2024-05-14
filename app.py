from flask import Flask, request
import json
import tldextract
import os
from gensim.models import KeyedVectors

# Load keyed vectors
kv_1 = KeyedVectors.load('model_files/domain_vectors.kv')
kv_2 = KeyedVectors.load('model_files/model_apiv2.kv')

app = Flask(__name__)


# Extract registered domain
def get_regd(url):
    ext = tldextract.extract(url)
    return ext.registered_domain


def get_similar_domains(pos_domains, neg_domains, limit, model):
    # Ensure that domain is in the model
    neg_domains = [x for x in neg_domains if x in model.key_to_index.keys()]
    pos_domains = [x for x in pos_domains if x in model.key_to_index.keys()]

    # Get similar domains
    results = model.most_similar(positive=pos_domains, negative=neg_domains, topn=limit) if pos_domains else []

    return [{"domain": x[0], "score": round(float(x[1]), 4)} for x in results]


def handle_request(model):
    try:
        # Parse domains
        pos_domains = [get_regd(x) for x in request.args.get('pos_domains', '').split(',')[:10]] if request.args.get('pos_domains') else []
        neg_domains = [get_regd(x) for x in request.args.get('neg_domains', '').split(',')[:10]] if request.args.get('neg_domains') else []

        # Max limit = 100
        limit = min(int(request.args.get('limit', 10)), 100)

        # Early exit of no pos_domain
        if not pos_domains:
            return json.dumps({"similar": []}), 200, {"Content-Type": "application/json", "Access-Control-Allow-Origin": "*"}

        # Fetch similar domains
        results = get_similar_domains(pos_domains, neg_domains, limit, model)

        return json.dumps({"similar": results}), 200, {"Content-Type": "application/json", "Access-Control-Allow-Origin": "*"}

    except Exception as e:
        # Print Error to logs
        print(f'Error: {e}')
        return str("Whoops! Something went wrong"), 500, {"Content-Type": "application/json", "Access-Control-Allow-Origin": "*"}


@app.route('/apiv1')
def apiv1():
    return handle_request(kv_1)


@app.route('/apiv2')
def apiv2():
    return handle_request(kv_2)


if __name__ == "__main__":
    app.run(debug=True, host='0.0.0.0', port=int(os.environ.get('PORT', 8080)))