# **Onshape- Heroku App**
This is an Onshape application that is available under "Utilities" in the Onshape App Store. 
** Disclaimer: it is only available if you have an Onshape account in the rogers enterprise ** 

### **Using STL viewer**
This app requires to be run in a tab of Onshape, an iFrame. In this type of configuration, Onshape will pass documentId, workspaceId and elementId as query params to the frame. These are utilized by the STL app to give it context of what the active document is within Onshape.

STL could also be written to run independently of the tab in Onshape. It could connect to Onshape and get a list of documents for the currently logged in user and then allow the user to select which one to work with.

### **Overview of app**
Our app serves to provide an alternative way for students to learn CAD in a classroom setting. This app aims to facilitate learning CAD and tackles some of the "getting started" challenges. If you don't have access to an Onshape account under the rogers enterprise, feel free to take a look at our app using [this link](https://test-onshape-app.herokuapp.com/).

In the "Views" folder, you will find the .html files for all of the different pages available in the app. 
Ex: all of the Activities, the Resources page, and more. 

Video files and images are available in their respective folders in "Public."

Find the stylesheet, where all the css and styling for the app is written, in "Public/stylesheets." 

