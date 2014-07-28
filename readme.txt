
/********************************************************************
 **							           **
 **	Description: Client-side web application "Crypto Chat"     **
 **	Author: Georgi Yankov					   **
 **	Author URI: http://gsy-design.com/                         **
 **	Author E-mail: webmaster@gsy-design.com			   **
 **	Version: 2.0					           **
 **								   **
 ********************************************************************/


=====================================================================
	
	TECHNICAL DOCUMENTATION OF CODE

=====================================================================


=====================================================================
	1. Overview
=====================================================================

Current project represents client-side web application for crypto
chat. After users get registered or logged in they can send messages
to each other which are encrypted by beforehand known to both of them
secret key. Processes as encryption and decryption are made on the
client side therefore the chat messages cannot be decrypted on the
server.


=====================================================================
	2. Global NameSpace
=====================================================================

The global scope is protected by the name space called “myNameSpace”:

	var myNameSpace = myNameSpace || {};

In case the same name space is met on the application use it, if not
create an empty object.


=====================================================================
	3. Structure of code
=====================================================================

The code of the application is nested in an object called
“CryptoChat” and is wrapped in a self-execution anonymous function:

	myNameSpace.CryptoChat = (function () {
		// nested code goes here
	})();

The code nested might be called private for the “myNameSpace”, while
the returned object after it:

	return {
        	serviceRootUrl: serviceRootUrl
	}

might be called public as it could be changed via:

	myNameSpace.CryptoChat.serviceRootUrl = YourValue;


=====================================================================
	4. Special functions
=====================================================================

	timer();  // Timer for non activity

	addEvent(obj, event, fn);  // Cross-browser event-handler
				      registration

	myPreventDefault(event);  // Cross-browser prevent-default
				     function

	getCurrentTime();  // Get current time in format 15:14 pm/am

	moveScrollToBottom(element);  // Move scrollbar to bottom


=====================================================================
	5.  Service operations
=====================================================================

http://cryptochat.apphb.com/CryptoChatService.svc/ - service root URL

GET operations:

	get-next-message/{sessionID} – listens for messages from the
				       server
	list-users/{sessionID} – request to get the list of all
                                 online users
	logout/{sessionID} – request for logout

POST opertions:

	register – request for registration

	login – request for login

	invite-user – make invitation via sending a secret key

	response-chat-invitation – response to an invitation via
				   responding with a secret key

	start-chat – request to start a chat session

	send-chat-message – request to send a chat message

	cancel-chat – request to cancel the chat session


=====================================================================
	6. Web Storage
=====================================================================

Once a user get registered or get logged in certain special data is
stored in a session storage: 

        sessionStorage.setItem('isLoggedIn', true);

        sessionStorage.setItem('name', currentUser.name);

        sessionStorage.setItem('sessionID', data.sessionID);

Having that into consideration at the beginning of the code is made a
check if those data is already stored in the session storage and if
so use it:

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

In case of logout the session storage is cleared via:

	sessionStorage.clear();


=====================================================================
	7. Server errors treatment
=====================================================================

The errors from the server are treated via the two functions:

	serverErrorsTreatment(error);  // Server errors treatment
	showServerErrors(errorMsg);  // Show server errors to the
					user

If a server error occurs it is shown in a special area on the right
bottom side of the application. Errors are displayed in red color.


=====================================================================
	8. Cryptography
=====================================================================

For the cryptography is used an object literal:

        cryptography = {
            // AES encryption
            encrypt: function (message, key) {
		…
            },

            // AES decryption
            decrypt: function (message, key) {
		…
            },

            // Use of SHA1 hash function
            // The auth-key is made by the formula SHA1(username + password)
            SHA1Algorithm: function (username, password) {
		…
            }
        };

The following JS libraries are needed to be included:

<!-- SHA1 Algorithm -->
<script src="http://crypto-js.googlecode.com/svn/tags/3.0.2/build/rollups/sha1.js">
</script>

<!-- Advanced Encryption Standard (AES) -->
<script src="http://crypto-js.googlecode.com/svn/tags/3.0.2/build/rollups/aes.js">
</script>