/*!
 * Connect - Firebase
 * Copyright(c) 2014 Mike Carson <ca98am79@gmail.com>
 * MIT Licensed
 */
/**
 * Module dependencies.
 */
var Firebase = require('firebase');

/**
 * One day in milliseconds.
 */

var oneDayInMilliseconds = 86400000;

/**
 * Return the `FirebaseStore` extending `connect`'s session Store.
 *
 * @param {object} connect
 * @return {Function}
 * @api public
 */

module.exports = function (session) {
    /**
     * Connect's Store.
     */

    var Store = session.Store;

    /**
     * Initialize FirebaseStore with the given `options`.
     *
     * @param {Object} options
     * @api public
     */

    function FirebaseStore(options) {
        options = options || {};
        Store.call(this, options);

        this.host = options.host;
        this.token = options.token;
        this.cleanSid = options.cleanSid || function (sid) {
        	// Firebase does not allow certain characters
        	//	see: https://www.firebase.com/docs/creating-references.html
            return sid.replace(/\.|#|\$|\[|\]/g, '_');
        };

        if (this.token) {
            var sessionRef = new Firebase('https://' + this.host);
            sessionRef.auth(this.token);
        }

	}
    /*
     *  Inherit from `Store`.
     */

    // FirebaseStore.prototype.__proto__ = Store.prototype;
    FirebaseStore.prototype = Object.create(Store.prototype);

    /**
     * Attempt to fetch session by the given `sid`.
     *
     * @param {String} sid
     * @param {Function} fn
     * @api public
     */

    FirebaseStore.prototype.get = function (sid, fn) {

        var self = this;
        sid = this.cleanSid(sid);
        var now = +new Date;
        var sessionRef = new Firebase('https://' + this.host + '/sessions/' + sid);

        sessionRef.once('value', function (snapshot) {
            try {
                if (!snapshot || snapshot.val() === null) {
                    return fn(null, null);
                } else {
                    if (!snapshot.val()) return fn(null, null);
                    else if (snapshot.val().expires && now >= snapshot.val().expires) {
                        self.destroy(sid, fn);
                    } else {
                        var sess = snapshot.val().sess.toString();
                        sess = JSON.parse(sess);
                        return fn(null, sess);
                    }
                }
            } catch (err) {
                fn(err);
            }
        });

    };

    /**
     * Commit the given `sess` object associated with the given `sid`.
     *
     * @param {String} sid
     * @param {Session} sess
     * @param {Function} fn
     * @api public
     */

    FirebaseStore.prototype.set = function (sid, sess, fn) {

        sid = this.cleanSid(sid);
        var expires = typeof sess.cookie.maxAge === 'number' ? (+new Date()) + sess.cookie.maxAge : (+new Date()) + oneDayInMilliseconds;
        var jsonSess = JSON.stringify(sess);

        var sessionRef = new Firebase('https://' + this.host + '/sessions/' + sid);
        sessionRef.set({
            expires: JSON.stringify(expires),
            type: 'connect-session',
            sess: jsonSess
        }, fn);

    };

    /**
     * Destroy the session associated with the given `sid`.
     *
     * @param {String} sid
     * @param {Function} fn
     * @api public
     */

    FirebaseStore.prototype.destroy = function (sid, fn) {

        sid = this.cleanSid(sid);
        var sessionRef = new Firebase('https://' + this.host + '/sessions/' + sid);
        sessionRef.remove(fn);

    };

    /**
     * Clear all sessions.
     *
     * @param {Function} fn
     * @api public
     */

    FirebaseStore.prototype.clear = function (fn) {

        var sessionRef = new Firebase('https://' + this.host + '/sessions');
        sessionRef.remove(fn);

    };

    return FirebaseStore;
};
