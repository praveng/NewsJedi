from flask import Flask, request
import json
import tldextract
import os
from gensim.models import Word2Vec

model = Word2Vec.load("domain_word2vec_1.model")

app = Flask(__name__)


# Clean Domains
def get_regd(url):
    ext = tldextract.extract(url)
    return ext.registered_domain


def get_similar_domains(pos_domains, neg_domains, limit):

    # Ensure that domains are included in the model before querying
    neg_domains = [x for x in neg_domains if x in model.wv.key_to_index.keys()]
    pos_domains = [x for x in pos_domains if x in model.wv.key_to_index.keys()]

    # Get similar domains
    results = model.wv.most_similar(positive=pos_domains, negative=neg_domains, topn=limit)

    formatted_results = [
        {
            "domain": x[0],
            "score": round(float(x[1]), 4)
        }
        for x in results
    ]

    return formatted_results


@app.route('/apiv1')
def main():
    try:
        pos_domains = []
        neg_domains = []
        limit = int(request.args.get('limit', 10))

        if limit > 100:
            limit = 100

        # Parse out domains from query parameters, and strip out registered domains
        if len(request.args.get('pos_domains', '')) > 0:
            pos_domains = [x for x in request.args.get('pos_domains').split(',')][:10]
            pos_domains = [get_regd(x) for x in pos_domains]

        if len(request.args.get('neg_domains', '')) > 0:
            neg_domains = [x for x in request.args.get('neg_domains').split(',')][:10]
            neg_domains = [get_regd(x) for x in neg_domains]

        if len(pos_domains) == 0:
            return json.dumps({"similar": []}), 200, {"Content-Type": "application/json",
                                                      "Access-Control-Allow-Origin": "*"}

        # Query for similar domains
        results = get_similar_domains(pos_domains, neg_domains, limit)

        result_json = json.dumps({"similar": results})

        return result_json, 200, {"Content-Type": "application/json", "Access-Control-Allow-Origin": "*"}

    except Exception as e:
        print(e)
        return str("Whoops! Something went wrong"), 400, {"Content-Type": "application/json",
                                                          "Access-Control-Allow-Origin": "*"}


if __name__ == "__main__":
    app.run(debug=True, host='0.0.0.0', port=int(os.environ.get('PORT', 8080)))
