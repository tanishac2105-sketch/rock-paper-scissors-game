from flask import Flask, render_template, request, jsonify
import random

app = Flask(__name__)

choices = ["rock", "paper", "scissors"]

def get_winner(user_choice, computer_choice):
    if user_choice == computer_choice:
        return "Draw"
    elif user_choice == 0 and computer_choice == 2:
        return "You win!"
    elif computer_choice == 0 and user_choice == 2:
        return "Computer wins!"
    elif user_choice > computer_choice:
        return "You win!"
    else:
        return "Computer wins!"

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/play", methods=["POST"])
def play():
    data = request.get_json()

    mapping = {
        "rock": 0,
        "paper": 1,
        "scissors": 2
    }

    user_choice_str = data["choice"]
    user_choice = mapping[user_choice_str]

    computer_choice = random.randint(0, 2)

    result = get_winner(user_choice, computer_choice)

    reverse_mapping = ["rock", "paper", "scissors"]

    return jsonify({
        "user_choice": reverse_mapping[user_choice],
        "computer_choice": reverse_mapping[computer_choice],
        "result": result
    })

if __name__ == "__main__":
    app.run(debug=True)