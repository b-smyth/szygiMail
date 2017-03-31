'use strict';

var http = require('../common/httpClient.js');
var core = require('../common/core.js');
var Q = require('q');

module.exports = function () {

    var IDAM_SUBJECTS = [
        'Account deregistered on Common Platform',
        'Accountable person details have changed on Common Platform',
        'Change of name on your Common Platform account',
        'Email notification list updated on Common Platform',
        'New user added on Common Platform',
        'Organisation deregistered on Common Platform',
        'Organisation details have changed on Common Platform',
        'Organisation re-registered on Common Platform',
        'User changed to an Administrator on Common Platform',
        'User deregistered on Common Platform',
        'User re-registered on Common Platform',
    ];

    var IDP_SUBJECTS = [
        'Account locked on Common Platform',
        'Authentication device added to your Common Platform account',
        'Authentication device removed from your Common Platform account',
        'Change of email address and username on your Common Platform account',
        'Change of password on your Common Platform account',
        'Mobile phone number changed on Common Platform',
        'Re-registration of your Common Platform Account',
        'Register Your Common Platform Account',
        'Reset Your Common Platform Account',
    ];

    var getIdamLatestEmail = function (userEmail, subject) {
        return getLatestEmail(core.getConfig().emailMockService.url, userEmail, subject).then(function (response) {
            var newlinesRegex = /\n/g;
            var doubleDotsRegex = /\.\./g;

            // Workaround for newline not properly escaped by IDP Email Stub (replacing them with <br /> as will be html)
            // Workaround for issue in ISG Email Stub where dots are sometimes duplicated (due to that registration link gets broken)
            return JSON.parse(
                response.body.replace(doubleDotsRegex, '.').replace(newlinesRegex, '<br />')
            )
        })
    };

    var getLatestEmail = function (emailMockBaseUrl, userEmail, subject) {
        var GET_LAST_EMAIL = '/entry-point/getlastemail/';

        return http.sendRequest({
            url: emailMockBaseUrl + GET_LAST_EMAIL + userEmail,
            qs: {
                subject: subject
            },
            method: 'GET'
        });
    }

    this.getUserRegistrationToken = function (userEmail) {
        return getIdamLatestEmail(userEmail, 'Register Your Common Platform Account').then(function (email) {
            var tokenRegex = /.*#\/register\/(.*)'/
            var tokenMatches = tokenRegex.exec(email.Body);

            if (tokenMatches) {
                return tokenMatches[1];
            } else {
                throw new Error("Could not retrieve registration token for user:", userEmail);
            }
        });
    };

    this.getOtpCode = function (userEmail) {
        return getIdamLatestEmail(userEmail, 'OTP notification').then(function (email) {
            var otpCodeRegex = /Your Common Platform one-time passcode is \W*(.*)/
            var otpMatches = otpCodeRegex.exec(email.Body);

            if (otpMatches) {
                return otpMatches[1];
            } else {
                throw new Error("Could not retrieve OTP code for user:", userEmail);
            }
        });
    }

    var extractToken = function (emailBody) {
        var tokenRegex = /.*to http.*\/(.*) or by.*/
        var tokenMatches = tokenRegex.exec(emailBody);

        if (tokenMatches) {
            return tokenMatches[1];
        } else {
            throw new Error("Could not retrieve registration token from email:" + emailBody);
        }
    };

    this.getAllEmails = function (userEmail) {
        var requests = IDP_SUBJECTS.concat(IDAM_SUBJECTS)
            .map(function (subject) {
                return getIdamLatestEmail(userEmail, subject);
            });
        return Q.all(requests)
            .then(function (emails) {
                console.log(emails);
                return emails.filter(function (email) {
                    return email.Body !== undefined;
                });
            });
    };

};
