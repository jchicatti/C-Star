# C-Star
A WhatsApp bot by J.D. Chicatti.\
Thesis project to earn the degrees of B. Sc. Computer Engineering and B. Sc. Mechatronics Engineering.
***
Save on internet bills (mobile data/satellite broadband). Receive broswer-like content through WhatsApp.

# Features
- Receive help, menu and info preset messages.

For any given search term:
- Receive plain **text** responses generated by a language model (either from the official OpenAI API or a free unlimited container GPT-4).
- Receive **images** as WhatsApp media (primarily JPG and PNG, configurable options available) alongside source reference.
- Receive **video** URLs from mainstream video hosting websites.
- Receive **Wikipedia** articles and pages (including disambiguations) as plain text  alongside source reference.
- Receive **DALL-E** generated artistic depictions as WhatsApp media.

Since every message is handled as plain text, WhatsApp media and URLs you will be harnessing the unlimited data allocated for social media and messaging apps.

# How to set it up
Prerequisites:
- A computer system with an Internet connection.
- A version of Node.js with the Node Package Manager (NPM).

You can verify these prerequisites by running the `node` and `npm` commands.

1. Once you have that, you need to download this repository as ZIP and extract it to your local files.
![image](https://github.com/jchicatti/C-Star/assets/56322123/a89c7c8d-79d2-4ca4-9eac-a02b76a021fa)


2. The first time running C Star you need to install the required NPM dependencies. You can do this easily by running the `dependencies.bat` batch file on Windows, or by executing the equivalent command for your OS inside the `/project` folder.
```
npm install whatsapp-web.js axios qrcode-terminal fs gpti qrcode readline fast-csv
```
3. With that set up, you can now run the node with the `run.bat` batch file on Windows, or by running the following command inside the `/project` folder.
```
node v0.1.6.js
```
4. When the node is running, you will be prompted with a QR code (it will also be saved to the `/downloads` folder) which you need to scan using the "Link a Device" feature on WhatsApp.

C-Star is now ready and running. Be sure to personalize the preset messages to your preference beforehand.

# How it works
You may find the detailed context, objective, analysis of the problem, methodology, design of the solution, architecture, implementation, standards used, tests, results and their analysis in the full thesis document available [here](example.com).
