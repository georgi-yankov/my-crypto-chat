var myNameSpace = myNameSpace || {};

myNameSpace.CryptoChat = (function () {
    var currentUser;  // keeps data for the current logged-in user

    // If the user is logged in use his session storage data
    if (sessionStorage.getItem('name')) {
        currentUser = {
            isLoggedIn: true,
            name: sessionStorage.getItem('name'),
            sessionID: sessionStorage.getItem('sessionID')
        };
    } else {
        currentUser = {
            isLoggedIn: false,
            name: '',
            sessionID: ''
        };
    }

    var serviceRootUrl = "http://cryptochat.apphb.com/CryptoChatService.svc/",  // service root URL
        mainNav = document.getElementById('main-nav'),
        mainNavUL = mainNav.getElementsByTagName('ul')[0],
        leftSidebar = document.getElementById('left-sidebar'),
        content = document.getElementById('content'),
        usersPanel = document.getElementById('users-panel'),
        infoPanel = document.getElementById('info-panel'),
        invitedUser,  // keep inveted user data
        count,
        counter,  // used to keep interval ID from setInterval(timer, 1000)
        refreshIntervalId,  // used to keep interval ID from setInterval(getNextServerMessage, 500)
        initialSiteContent = {
            mainNavULHTML:
                '<li id="login-nav-button"><a href="#">Login</a></li>' +
                '<li id="register-nav-button"><a href="#">Register</a></li>',
            usersPanelHTML:
                '<p>In order to see the online users you need to login first!</p>',
            contentHTML:
                '<div id="before-login">' +
                    '<p>Get chatting with your friends...</p>' +
                    '<p>They are waiting to have fun with you!</p>' +
                    '<img src="img/friends.png" alt="Friends" width="534" height="334" />' +
                '</div>',
            infoPanelHTML: '<p>In order to use current chat you need to know a secret word shared with a friend!<p>'

        },
        // Load main parts when logged-in
        mainPartsLoader = {
            // Load main navigation appropriate if logged-in
            loadMainNavIfLogged: function () {
                var newNavButtonsHTML = '<li id="logout-nav-button"><a href="#">Logout</a></li>',
                    helloMessage = document.createElement('p');

                helloMessage.innerHTML = 'Hello <span>' + currentUser.name + '</span>';
                mainNavUL.innerHTML = newNavButtonsHTML;  // add new navigation buttons
                mainNav.insertBefore(helloMessage, mainNav.firstChild);  // insert hello message

                var logoutNavButton = document.getElementById('logout-nav-button');
                addEvent(logoutNavButton, 'click', onLogout);
            },

            // Load the area for "Who invites you"
            loadWhoInvitesYou: function () {
                var whoInvitesYouHTML =
                    '<h3>Who invites you:</h3>' +
                    '<ul></ul>';
                var createDiv = document.createElement('div');
                createDiv.id = 'who-invites-you';
                createDiv.innerHTML = whoInvitesYouHTML;
                leftSidebar.appendChild(createDiv);
            },

            // Load chat box HTML
            loadChatBox: function () {
                var chatBoxHTML =
                    '<div id="chat-box-wrapper">' +
                        '<div id="prepare-for-chat">' +
                        '</div>' +
                        '<div id="chat-box-screen-wrapper">' +
                            '<div id="chat-box-screen">' +
                            '</div>' +
                        '</div>' +
                        '<textarea id="chat-box-input" placeholder="Send a message..." disabled></textarea>' +
                        '<button id="cancel-chat" disabled>Cancel Chat</button>' +
                        '<button id="chat-box-button" disabled>Send</button>' +
                    '</div>';
                content.innerHTML = chatBoxHTML;  // load chat box in the content
                var chatBoxButton = document.getElementById('chat-box-button');
                addEvent(chatBoxButton, 'click', sendMessage);

                // Make it possible to send message on pressing "enter" key
                $('#chat-box-input').keypress(function (e) {
                    if (e.which === 13) {
                        sendMessage();
                    }
                });
            },

            // Load info panel HTML
            loadInfoPanel: function () {
                infoPanel.innerHTML =
                    '<div id="server-messages">' +
                        '<h3>Server messages:</h3>' +
                        '<ul></ul>' +
                    '</div>' +
                    '<div id="server-errors">' +
                        '<h3>Server errors:</h3>' +
                        '<ul></ul>' +
                    '</div>';
            }
        },
        // Ajax request
        ajaxRequest = {
            // Ajax GET request function
            performGetRequest: function (serviceUrl, onSuccess, onError) {
                $.ajax({
                    url: serviceUrl,
                    type: "GET",
                    timeout: 5000,
                    dataType: "json",
                    success: onSuccess,
                    error: onError
                });
            },

            // Ajax POST request function
            performPostRequest: function (serviceUrl, data, onSuccess, onError) {
                $.support.cors = true;  // fix for IE browser
                $.ajax({
                    url: serviceUrl,
                    type: "POST",
                    contentType: "application/json",
                    timeout: 5000,
                    dataType: "json",
                    data: JSON.stringify(data),
                    success: onSuccess,
                    error: onError
                });
            }
        },
        // Cryptography
        cryptography = {
            // AES encryption
            encrypt: function (message, key) {
                var encrypted = CryptoJS.AES.encrypt(message.toString(), key);
                encrypted = encrypted.toString();
                return encrypted;
            },

            // AES decryption
            decrypt: function (message, key) {
                var decrypted = CryptoJS.AES.decrypt(message, key);
                decrypted = decrypted.toString(CryptoJS.enc.Utf8);
                return decrypted;
            },

            // Use of SHA1 hash function
            // The auth-key is made by the formula SHA1(username + password)
            SHA1Algorithm: function (username, password) {
                var hash = CryptoJS.SHA1(username + password);
                hash = hash.toString();
                return hash;
            }
        };

    // If user is logged in load appropriate content
    if (currentUser.isLoggedIn) {
        mainPartsLoader.loadMainNavIfLogged();
        getAllUsers();
        mainPartsLoader.loadWhoInvitesYou();
        mainPartsLoader.loadChatBox();
        mainPartsLoader.loadInfoPanel();
        refreshIntervalId = setInterval(getNextServerMessage, 500);
    } else {
        // Load initial site content
        loadInitialSiteContent();
    }

    // Loads initial site content
    function loadInitialSiteContent() {
        mainNavUL.innerHTML = initialSiteContent.mainNavULHTML; // load initial main navigation HTML
        usersPanel.innerHTML = initialSiteContent.usersPanelHTML;  // load initial users-panel HTML
        content.innerHTML = initialSiteContent.contentHTML;  // load initial content HTML
        infoPanel.innerHTML = initialSiteContent.infoPanelHTML;  // load initial info-panel HTML

        var regNavButton = document.getElementById('register-nav-button'),
            loginNavButton = document.getElementById('login-nav-button');

        if (document.getElementById('who-invites-you')) {
            var whoInvitesYou = document.getElementById('who-invites-you');
            whoInvitesYou.parentNode.removeChild(whoInvitesYou); // remove it as it remains after logout
        }

        addEvent(regNavButton, 'click', onRegNavButtonClick);
        addEvent(loginNavButton, 'click', onLoginNavButtonClick);
    }

    // Shows registration form
    function onRegNavButtonClick(event) {
        var submitRegFormButton,
            regFormHTML =
                '<!-- REGISTRATION FORM -->' +
                '<h2 class="reg-form-title">Registratiion form</h2>' +
                '<form id="reg-form" class="reg-and-login-form" role="form">' +
                    '<p>' +
                        '<label for="tb-username">Username:</label>' +
                        '<input id="tb-username" type="text" placeholder="username" autofocus required tabindex="1" />' +
                    '</p>' +
                    '<p>' +
                        '<label for="tb-password">Password:</label>' +
                        '<input id="tb-password" type="password" placeholder="password" required tabindex="2" />' +
                    '</p>' +
                    '<p>' +
                        '<label for="tb-password-retype">Password (retype):</label>' +
                        '<input id="tb-password-retype" type="password" placeholder="password" required tabindex="3" />' +
                    '</p>' +
                    '<p>' +
                        '<input id="submit-reg-form" type="submit" value="Get registered" tabindex="4" />' +
                    '</p>' +
                '</form>';

        content.innerHTML = regFormHTML;  // load registration form

        mainPartsLoader.loadInfoPanel();

        submitRegFormButton = document.getElementById('submit-reg-form');
        addEvent(submitRegFormButton, 'click', onRegFormSubmit);
        myPreventDefault(event);
    }

    // Submit registration form
    function onRegFormSubmit(event) {
        var regForm = {
            username: document.getElementById('tb-username').value,
            password: document.getElementById('tb-password').value,
            passwordRetype: document.getElementById('tb-password-retype').value,
            errorList: [],  // array to keep all possible errors
            isValid: false,  // registration form is not valid by default
            validate: function () {  // try to validate the form
                // at least 1 - 30 characters that are letters, numbers, dot, dash or underscore
                var checkUsername = /^[A-Za-z0-9\.\-\_]{1,30}$/,
                    // at least 6 - 20 characters that are letters, numbers, dot, dash or underscore
                    checkPassword = /^[A-Za-z0-9\.\-\_]{6,20}$/;

                if (this.username === '' || this.password === '' || this.passwordRetype === '') {
                    this.errorList.push('Please fill in all of the input fields!');
                } else if (!checkUsername.test(this.username)) {
                    this.errorList.push('Username needs to have at least 1 - 30 characters that are letters, numbers, dot, dash or underscore');
                } else if (!checkPassword.test(this.password) || !checkPassword.test(this.passwordRetype)) {
                    this.errorList.push('Your passswords must have at least 6 - 20 characters that are letters, numbers, dot, dash or underscore');
                } else if (this.password !== this.passwordRetype) {
                    this.errorList.push('Your passswords don\'t match.');
                } else {
                    this.isValid = true;
                }
            }
        };

        regForm.validate();

        if (regForm.isValid) {
            // Data ready to be send to the server
            var dataToSend = {
                username: regForm.username,
                authCode: cryptography.SHA1Algorithm(regForm.username, regForm.password)
            };

            // Register request
            ajaxRequest.performPostRequest(
                serviceRootUrl + 'register',
                dataToSend,
                onRegOrLoginFormSubmitSuccess,
                onRegOrLoginFormSubmitError
                );
            currentUser.name = regForm.username;
        } else {
            formErrorTreatment(regForm.errorList);
        }
        myPreventDefault(event);
    }

    // Shows login form
    function onLoginNavButtonClick(event) {
        var submitLoginFormButton,
            loginFormHTML =
                '<!-- LOGIN FORM -->' +
                '<h2 class="login-form-title">Login form</h2>' +
                '<form id="login-form" class="reg-and-login-form" role="form">' +
                    '<p>' +
                        '<label for="tb-username">Username:</label>' +
                        '<input id="tb-username" type="text" placeholder="username" autofocus required tabindex="1" />' +
                    '</p>' +
                    '<p>' +
                        '<label for="tb-password">Password:</label>' +
                        '<input id="tb-password" type="password" placeholder="password" required tabindex="2" />' +
                    '</p>' +
                    '<p>' +
                        '<input id="submit-login-form" type="submit" value="Login" tabindex="3" />' +
                    '</p>' +
                '</form>';

        content.innerHTML = loginFormHTML;  // load login form

        submitLoginFormButton = document.getElementById('submit-login-form');
        addEvent(submitLoginFormButton, 'click', onLoginFormSubmit);

        mainPartsLoader.loadInfoPanel();

        myPreventDefault(event);
    }

    // Submit login form
    function onLoginFormSubmit(event) {
        var loginForm = {
            username: document.getElementById('tb-username').value,
            password: document.getElementById('tb-password').value,
            errorList: [],  // array to keep all possible errors
            isValid: false,  // login form is not valid by default
            validate: function () {  // try to validate the form
                // at least 1 - 30 characters that are letters, numbers, dot, dash or underscore
                var checkUsername = /^[A-Za-z0-9\.\-\_]{1,30}$/,
                    // at least 6 - 20 characters that are letters, numbers, dot, dash or underscore
                    checkPassword = /^[A-Za-z0-9\.\-\_]{6,20}$/;

                if (this.username === '' || this.password === '') {
                    this.errorList.push('Please fill in all of the input fields!');
                } else if (!checkUsername.test(this.username) || !checkPassword.test(this.password)) {
                    this.errorList.push('Username or password is not correct!');
                } else {
                    this.isValid = true;
                }
            }
        };

        loginForm.validate();

        if (loginForm.isValid) {
            // Data ready to be send to the server
            var dataToSend = {
                username: loginForm.username,
                authCode: cryptography.SHA1Algorithm(loginForm.username, loginForm.password)
            };

            // Login request
            ajaxRequest.performPostRequest(
                serviceRootUrl + 'login',
                dataToSend,
                onRegOrLoginFormSubmitSuccess,
                onRegOrLoginFormSubmitError
                );
            currentUser.name = loginForm.username;
        } else {
            formErrorTreatment(loginForm.errorList);
        }
        myPreventDefault(event);
    }

    // Register or Login request - SUCCESS
    function onRegOrLoginFormSubmitSuccess(data) {
        // When user first time get logged-in keep his data in sessionStorage
        sessionStorage.setItem('isLoggedIn', true);
        sessionStorage.setItem('name', currentUser.name);
        sessionStorage.setItem('sessionID', data.sessionID);

        currentUser.isLoggedIn = true;
        currentUser.sessionID = data.sessionID;

        mainPartsLoader.loadMainNavIfLogged();
        getAllUsers();
        mainPartsLoader.loadWhoInvitesYou();
        mainPartsLoader.loadChatBox();
        mainPartsLoader.loadInfoPanel();
        refreshIntervalId = setInterval(getNextServerMessage, 500);
        count = 300,  // 5 min * 60 sec = 300
        counter = setInterval(timer, 1000);  // 1000 will run it every 1 second
    }

    // Register or Login request - ERROR
    function onRegOrLoginFormSubmitError(error) {
        currentUser.name = '';
        serverErrorsTreatment(error);
    }

    // Registration & Login form error treatment
    function formErrorTreatment(errorList) {
        var formErrorBoxHTML = '';
        if (!$('div.form-error-box')[0]) {  // check if already exist an error message
            $('#content').append('<div class="form-error-box"></div>');
        }
        for (var i = 0; i < errorList.length; i++) {
            formErrorBoxHTML += '<p>' + errorList[i] + '</p>';
        }
        $('div.form-error-box').html(formErrorBoxHTML);
    }

    // Get all users request
    function getAllUsers() {
        // Ajax-loader image
        usersPanel.innerHTML = '<img src="img/ajax-loader.gif" width="16" height="11" alt="Loading image" />';

        ajaxRequest.performGetRequest(
            serviceRootUrl + 'list-users/' + currentUser.sessionID,
            onGetAllUsersSuccess,
            onGetAllUsersError
            );
    }

    // Get all users request - SUCCESS
    function onGetAllUsersSuccess(users) {
        var usersLength = users.length,
            usersHTML = '<h3>Online users:</h3>' +
                        '<ul>';

        for (var i = 0; i < usersLength; i++) {
            usersHTML += '<li><a data-user-id="user-' + i + '" href="#">' + users[i] + '</a></li>';
        }

        usersHTML += '</ul>';
        usersPanel.innerHTML = usersHTML;

        $('#users-panel li a').on('click', inviteUser);
    }

    // Get all users request - ERROR
    function onGetAllUsersError(error) {
        serverErrorsTreatment(error);
    }

    // Invite user
    function inviteUser(event) {
        var $this = $(this);
        invitedUser = {
            id: $this.data('user-id'),
            name: $this.text()
        };

        var prepareForChatHTML =
            '<p>You want to invite <span class="bold">' + invitedUser.name + '</span> for chat?</p>' +
            '<form role="form">' +
                '<label for="secret-key-value">Enter secret key: </label>' +
                '<input id="secret-key-value" type="text" placeholder="secret key" required autofocus />' +
                '<button id="secret-key-button">invite</button>' +
            '</form>';
        var prepareForChat = $('#prepare-for-chat');
        prepareForChat.html(prepareForChatHTML)
                      .slideDown();

        var secretKeyButton = document.getElementById('secret-key-button');
        addEvent(secretKeyButton, 'click', secretKeyButtonClick);

        myPreventDefault(event);
    }

    // On secret key button click - MAKE INVITATION 
    function secretKeyButtonClick(event) {
        // Prevents from sending empty value
        if (document.getElementById('secret-key-value').value === '') {
            return;
        }

        var R = (Math.floor(Math.random() * 1000000000)),  // generate numbers in the interval of [0 … 999 999 999]
            K = document.getElementById('secret-key-value').value,  // the entered secret key
            challenge = cryptography.encrypt(R, K);

        currentUser.sentKey = K;  // keep sent key for reference

        var dataToSend = {
            sessionID: currentUser.sessionID,
            recipientUsername: invitedUser.name,
            challenge: challenge
        };

        // Invite user request
        ajaxRequest.performPostRequest(serviceRootUrl + 'invite-user', dataToSend,
            function (data) {
                var prepareForChat = $('#prepare-for-chat');
                prepareForChat.slideUp(function () {
                    prepareForChat.html('<p class="success-notice">Invitation to <span class="bold">' + invitedUser.name + '</span> is sent, ' +
                                        'please wait for his response!</p>');
                });
                prepareForChat.slideDown();
            },
            function (error) {
                serverErrorsTreatment(error);
            });
        myPreventDefault(event);
    }

    // Server errors treatment
    function serverErrorsTreatment(error) {
        var connection = JSON.stringify(error);
        connection = JSON.parse(connection);

        if (connection.responseText === '') {  // if there is no Internet connection
            clearInterval(refreshIntervalId);
            showServerErrors('No Internet connection!');
        } else {
            var errorJSON = JSON.parse(error.responseText),  // parse to JSON
                errorData = {
                    errorCode: errorJSON.errorCode,  // error code
                    errorMsg: errorJSON.errorMsg  // error message
                };

            // Check if user wants to send long message
            if (errorData.errorCode === 'ERR_BAD_MSG') {
                errorData.errorMsg = 'Can\'t send long messages!';
            }

            showServerErrors(errorData.errorMsg);
        }
    }

    // Show server errors to the user
    function showServerErrors(errorMsg) {
        var serverErrors = document.getElementById('server-errors'),
            time = getCurrentTime(),
            serverErrorsUL = serverErrors.getElementsByTagName('ul')[0],
            serverErrorsLI = document.createElement('li');

        serverErrorsLI.innerHTML = '<span>' + time + '</span>' + errorMsg;
        serverErrorsUL.appendChild(serverErrorsLI);

        moveScrollToBottom(serverErrorsUL);
    }

    // Get next server message
    function getNextServerMessage() {
        ajaxRequest.performGetRequest(serviceRootUrl + 'get-next-message/' + currentUser.sessionID,
            // Get next server message - SUCCESS
            function (data) {
                var messageText = data.msgText,
                    messageType = data.msgType,
                    username = data.username,
                    time = getCurrentTime(),
                    showMessage;

                // Stop if there are no messages waiting on the server
                if (messageType === 'MSG_NO_MESSAGES') {
                    return;
                }

                if (messageType !== 'MSG_USER_ONLINE' && messageType !== 'MSG_USER_OFFLINE') {
                    count = 300;
                }

                showMessage = '<span>' + time + '</span>';

                switch (messageType) {
                    case 'MSG_USER_ONLINE':
                        showMessage += username + ' is online';
                        getAllUsers();  // update the users list
                        break;
                    case 'MSG_USER_OFFLINE':
                        showMessage += username + ' is offline';
                        getAllUsers();  // update the users list
                        break;
                    case 'MSG_CHALLENGE':
                        showMessage += username + ' invites you';
                        currentUser.recipientUsername = username;  // keep recipient's username for reference                    

                        var whoInvitesYouUL = document.getElementById('who-invites-you').getElementsByTagName('ul')[0],
                            whoInvitesYouLI = document.createElement('li');

                        whoInvitesYouLI.innerHTML =
                            '<a class="accept-button" href="#" title="Accept invitation from ' + username + '">' + username + '</a>' +
                            '<button class="deny-button" title="Cancel invitation or chat">x</button>';
                        whoInvitesYouUL.appendChild(whoInvitesYouLI);

                        $('#who-invites-you button.deny-button').on('click', cancelChatInvitationOrSession);
                        $('#who-invites-you a.accept-button').on('click', acceptChatInvitation);
                        break;
                    case 'MSG_RESPONSE':
                        showMessage += username + ' sent a response to your chat invitation ';

                        currentUser.sender = username;  // keep sender's username for reference

                        var decrypted = cryptography.decrypt(messageText, currentUser.sentKey),
                            numberToCheck = 999999999 - parseInt(decrypted, 10);

                        // Check if key phrases match. If numberToCheck is NaN key phrases don't match
                        if (numberToCheck) {
                            // key phrases match
                            var dataToSend = {
                                sessionID: currentUser.sessionID,
                                recipientUsername: username
                            };
                            ajaxRequest.performPostRequest(serviceRootUrl + 'start-chat', dataToSend,
                                function (data) {
                                    // Make chat box enabled to type messages
                                    $('#chat-box-button').removeAttr('disabled');
                                    $('#chat-box-input').removeAttr('disabled');
                                    $('#cancel-chat').removeAttr('disabled');

                                    $('#prepare-for-chat')
                                        .slideUp(function () {
                                            $(this).html('<p class="success-notice">Enjoy your chat with <span class="bold">' + username + '</span>!</p>');
                                        })
                                        .slideDown()
                                        .delay(3000)
                                        .slideUp();

                                    var cancelChat = document.getElementById('cancel-chat');
                                    addEvent(cancelChat, 'click', cancelChatInvitationOrSession);
                                },
                                function (error) {
                                    serverErrorsTreatment(error);
                                });
                        } else {
                            // Inform the sender that key phrases don't match
                            $('#prepare-for-chat')
                                .slideUp(function () {
                                    $(this).html('<p class="error-notice"><span class="bold">' + username + '</span> responded with wrong key!</p>');
                                })
                                .slideDown();
                        }
                        break;
                    case 'MSG_START_CHAT':
                        showMessage += username + ' started a chat with you';

                        // Make chat box enabled to type messages
                        $('#chat-box-button').removeAttr('disabled');
                        $('#chat-box-input').removeAttr('disabled');
                        $('#cancel-chat').removeAttr('disabled');

                        $('#prepare-for-chat')
                            .slideUp(function () {
                                $(this).html('<p class="success-notice">Enjoy your chat with <span class="bold">' + username + '</span>!</p>');
                            })
                            .slideDown()
                            .delay(3000)
                            .slideUp();

                        $('#who-invites-you a.accept-button').parent('li').slideUp(function () {
                            $(this).remove();
                        });

                        var cancelChat = document.getElementById('cancel-chat');
                        addEvent(cancelChat, 'click', cancelChatInvitationOrSession);
                        break;
                    case 'MSG_CANCEL_CHAT':
                        showMessage += username + ' canceled to a chat invitation or а chat session with you';

                        $('#prepare-for-chat')
                            .slideUp(function () {
                                $(this).html('<p class="error-notice"><span class="bold">' + username + '</span> canceled your chat invitation or session!</p>');
                            })
                            .slideDown();

                        // Make chat box disabled to type messages
                        $('#chat-box-button').attr('disabled', 'disabled');
                        $('#chat-box-input').attr('disabled', 'disabled');
                        $('#cancel-chat').attr('disabled', 'disabled');
                        break;
                    case 'MSG_CHAT_MESSAGE':
                        showMessage += username + ' sent you a message.';
                        var returnedMessage = cryptography.decrypt(messageText, currentUser.sentKey || currentUser.returnedKey);
                        $('#chat-box-screen').append(
                            '<p>' +
                                '<span class="chat-box-nick chat-box-nick-second">' + username + ':</span>' +
                                '<span class="message-block">' + returnedMessage + '</span>' +
                                '<span class="message-time">' + getCurrentTime() + '</span>' +
                            '</p>'
                            );

                        var chatBoxScreenWrapper = document.getElementById('chat-box-screen-wrapper');
                        moveScrollToBottom(chatBoxScreenWrapper);
                        break;
                    default:
                        showMessage += 'something is wrong!!!';
                        break;
                }

                var serverMessages = document.getElementById('server-messages'),
                    serverMessagesUL = serverMessages.getElementsByTagName('ul')[0],
                    createLI = document.createElement('li');
                createLI.innerHTML = showMessage;

                serverMessagesUL.appendChild(createLI);
                moveScrollToBottom(serverMessagesUL);

                // Accept chat invitation
                function acceptChatInvitation(event) {
                    var closestLI = $(this).closest('li');

                    // Prevent from multiple appending a box for entering the secret key if
                    // it's alreay appended and shown
                    if (closestLI.find('div.accept-invitation-box').length === 0) {
                        closestLI.append(
                            '<div class="accept-invitation-box">' +
                                '<input type="text" placeholder="secret key" required autofocus />' +
                                '<button class="check-invitation-key-button">ok</button>' +
                            '</div>'
                            );
                        closestLI.find('div.accept-invitation-box').slideDown();
                    }

                    $('button.check-invitation-key-button').on('click', function () {
                        var K = closestLI.find('input').val();

                        if (K === '') {  // prevent from sending empty value
                            return;
                        }

                        currentUser.returnedKey = K;  // keep received key for reference
                        checkInvitationKey(messageText, K);
                    });

                    myPreventDefault(event);
                }
            },
            // Get next server message - ERROR
            function (error) {
                serverErrorsTreatment(error);
            });
    }

    // Cancel a chat invitation or а chat session with the current user
    function cancelChatInvitationOrSession() {
        var $this = $(this),  // cash $(this) for heigh performance
            dataToSend = {
                sessionID: currentUser.sessionID,
                recipientUsername: currentUser.recipientUsername || currentUser.sender
            };

        // IF it is to cancel invitation and not session
        if ($this.hasClass('deny-button')) {
            $this.closest('li').slideUp(function () { $(this).remove(); });  // remove the user from the list "Who invites you"
        }

        ajaxRequest.performPostRequest(serviceRootUrl + 'cancel-chat', dataToSend,
            function (data) {
                // Make chat box disabled to type messages
                $('#chat-box-button').attr('disabled', 'disabled');
                $('#chat-box-input').attr('disabled', 'disabled');
                $('#cancel-chat').attr('disabled', 'disabled');
            },
            function (error) {
                serverErrorsTreatment(error);
            });
    }

    // Check invitation key
    function checkInvitationKey(encrypted, secretPassphrase) {
        var decrypted = cryptography.decrypt(encrypted, secretPassphrase),
            randomNum = 999999999 - decrypted,
            respond = cryptography.encrypt(randomNum, secretPassphrase),
            dataTosend = {
                sessionID: currentUser.sessionID,
                recipientUsername: currentUser.recipientUsername,
                response: respond
            };

        // If secret keys don't math inform the user
        if (decrypted === '') {
            $('#prepare-for-chat')
                .slideUp(function () {
                    $(this).html('<p class="error-notice">Your keys don\'t match, please try with another key!</p>');
                })
                .slideDown();
        }
        responseChatInvitation(dataTosend);
    }

    // Response to chat invitation
    function responseChatInvitation(data) {
        ajaxRequest.performPostRequest(serviceRootUrl + 'response-chat-invitation', data,
            function (data) {
                //console.log('Response to chat invitation -> ', data);
            },
            function (error) {
                serverErrorsTreatment(error);
            });
    }

    // Send a message
    function sendMessage() {
        var chatBoxInput = $('#chat-box-input'),  // cache the input field
            inputMessage = chatBoxInput.val();  // typped message

        // Prevents from sending empty message or such with empty spaces
        if (inputMessage.replace(/\s/g, '') === '') {
            return;
        }

        var encryptedInputMessage = cryptography.encrypt(inputMessage, currentUser.returnedKey || currentUser.sentKey),
            dataToSend = {
                sessionID: currentUser.sessionID,
                recipientUsername: currentUser.recipientUsername || currentUser.sender,
                encryptedMsg: encryptedInputMessage
            };

        ajaxRequest.performPostRequest(serviceRootUrl + 'send-chat-message', dataToSend,
            function (data) {
                chatBoxInput.val('');  // clear the input field

                var createChatParagraph = document.createElement('p');
                var chatBoxScreen = document.getElementById('chat-box-screen');

                createChatParagraph.innerHTML =
                    '<span class="chat-box-nick chat-box-nick-first">' + currentUser.name + ':</span>' +
                    '<span class="message-block">' + inputMessage + '</span>' +
                    '<span class="message-time">' + getCurrentTime() + '</span>';
                chatBoxScreen.appendChild(createChatParagraph);

                var chatBoxScreenWrapper = document.getElementById('chat-box-screen-wrapper');
                moveScrollToBottom(chatBoxScreenWrapper);
            },
            function (error) {
                serverErrorsTreatment(error);
            });
    }

    // Logout request
    function onLogout(event) {
        ajaxRequest.performGetRequest(serviceRootUrl + 'logout/' + currentUser.sessionID,
            function (data) {
                clearInterval(counter);
                clearInterval(refreshIntervalId);
                $('#main-nav').children('p').remove();
                sessionStorage.clear();
                loadInitialSiteContent();
            },
            function (error) {
                serverErrorsTreatment(error);
            });
        // Check if event exist as the onLogout() function maight be fired from timer() function
        if (event) {
            myPreventDefault(event);
        }
    }

    // Timer for non activity
    function timer() {
        count = count - 1;
        if (count <= 0) {
            alert('You were logged out because of 5 minutes non activity!');
            onLogout();
        }
    }

    // Cross-browser event-handler registration
    function addEvent(obj, event, fn) {
        if (obj.addEventListener)
            obj.addEventListener(event, fn, false);  // W3C model
        else if (obj.attachEvent)
            obj.attachEvent('on' + event, fn);  // Microsoft model
    }

    // Cross-browser prevent-default function
    function myPreventDefault(event) {
        if (event.preventDefault) {  // if preventDefault exists run it on the original event
            event.preventDefault();
        } else {  // otherwise set the returnValue property of the original event to false (IE)
            event.returnValue = false;
        }
    }

    // Get current time in format 15:14 pm/am
    function getCurrentTime() {
        var currentTime = new Date(),
            hours = currentTime.getHours(),
            minutes = currentTime.getMinutes();

        if (minutes < 10) {
            minutes = '0' + minutes;
        }

        var timeToShow = hours + ':' + minutes;

        if (hours > 11) {
            timeToShow += 'pm';
        } else {
            timeToShow += 'am';
        }

        return timeToShow;
    }

    // Move scrollbar to bottom
    function moveScrollToBottom(element) {
        element.scrollTop = element.scrollHeight - element.clientHeight;
    }

    //// Gibberish AES encryption
    //function encrypt(message, key) {
    //    //GibberishAES.size(128);
    //    var encrypted = GibberishAES.enc(message, key);
    //    return encrypted;
    //}

    //// Gibberish AES decryption
    //function decrypt(message, key) {
    //    //GibberishAES.size(128);
    //    var decrypted = GibberishAES.dec(message, key);
    //    return decrypted;
    //}

    /* Public variables and methods (can access private vars and methods ) */
    return {
        serviceRootUrl: serviceRootUrl
    }
})();

// Change the service root URL via:
// myNameSpace.CryptoChat.serviceRootUrl = YourValue;