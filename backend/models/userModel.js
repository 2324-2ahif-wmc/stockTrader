import cryptojs from 'crypto-js';
import { Controller as UserController } from '../controllers/userController.js';

const userController = new UserController();
const hash = (password) => cryptojs.SHA512(password).toString();

export class User {
    _id;
    _name;
    _balance;
    _transactions;
    _currentStocks;
    _staredStocks;
    _favoriteStock;

    static from(user) {
        const newUser = new User();
        newUser._id = user.id;
        newUser._name = user.name;
        newUser._balance = user.balance;
        newUser._transactions = user.transactions;
        newUser._currentStocks = user.currentStocks;
        newUser._staredStocks = user.staredStocks;
        newUser._favoriteStock = user.favoriteStock;
        return newUser;
    }

    static signIn(username, password) {
        const user = userController.getByName(username);

        if (!user) {
            return [null, [404, 'user not found']];
        } else if (user.password !== hash(password)) {
            return [null, [401, 'password is incorrect']];
        } else {
            return [User.from(user), [200, 'signin successful']];
        }
    }

    static signUp(username, password) {
        if (userController.getByName(username)) {
            return [400, 'user already exists'];
        }

        userController.create(username, hash(password));
        return [200, 'user created'];
    }

    static delete(name, password) {
        const user = userController.getByName(name);

        if (!user) {
            return [404, 'user not found'];
        } else if (user.password !== hash(password)) {
            return [401, 'password is incorrect'];
        } else {
            userController.delete(name);
            return [200, 'user deleted'];
        }
    }

    static exists(id, name) {
        const user = userController.getById(id);
        return user && user.name === name ? true : false;
    }

    static buy(userId, symbol, quantity, price, timestamp) {
        const user = userController.getById(userId);

        if (!user.transactions) {
            user.transactions = [];
        }

        user.transactions.push({ symbol, quantity, price, timestamp });
        user.balance -= quantity * price + 75;
        userController.update(user);

        return user;
    }

    static updateFavoriteStock(userId, favoriteStock) {
        const user = userController.getById(userId);
        user.favoriteStock = favoriteStock;
        userController.update(user);
        return user;
    }

    getData() {
        return {
            id: this._id,
            name: this._name,
            balance: this._balance,
            transactions: this.transactions ? this.transactions : [],
            currentStocks: this._currentStocks ? this._currentStocks : [],
            staredStocks: this._staredStocks ? this._staredStocks : [],
            favoriteStock: this._favoriteStock
        };
    }

    get name() {
        return this._name;
    }

    get transactions() {
        return this._transactions;
    }

    set transactions(value) {
        this._transactions = value;
    }
}
