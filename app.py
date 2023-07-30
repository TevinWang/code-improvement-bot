from flask import Flask
import claude
import pr

# create flask server for nodejs to call

app = Flask(__name__)


@app.route("/setrepo/<repo_url>", methods=["GET"])
def run_stuff(repo_url):
    repo_url = repo_url.replace("%", "/")
    # receiving "username/repo" from nodejs
    claude.main("https://github.com/" + repo_url)
    pr.main(repo_url)
    return repo_url

if __name__ == "__main__":
    app.run(debug=True)
