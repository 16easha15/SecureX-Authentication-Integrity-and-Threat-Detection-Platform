let isLogin = false;
let users = {};
let historyData = JSON.parse(localStorage.getItem("history")) || [];

// Load users
let storedData = localStorage.getItem("users");
if(storedData){
    users = JSON.parse(storedData);
}

// Hash function
async function hashPassword(password){
const encoder=new TextEncoder();
const data=encoder.encode(password);
const hashBuffer=await crypto.subtle.digest('SHA-256',data);
const hashArray=Array.from(new Uint8Array(hashBuffer));
return hashArray.map(b=>b.toString(16).padStart(2,'0')).join('');
}

// Menu control
function setMode(mode){

document.querySelectorAll(".menu").forEach(el=>el.classList.remove("active"));

if(mode==="register"){
isLogin=false;
title.innerText="Register";
formBox.style.display="block";
historyBox.style.display="none";
document.querySelectorAll(".menu")[0].classList.add("active");

}else if(mode==="login"){
isLogin=true;
title.innerText="Login";
formBox.style.display="block";
historyBox.style.display="none";
document.querySelectorAll(".menu")[1].classList.add("active");

}else{
formBox.style.display="none";
historyBox.style.display="block";
document.querySelectorAll(".menu")[2].classList.add("active");
displayHistory();
}

message.innerText="";
clearFields();
}

// Popup
function showPopup(text){
popupText.innerText=text;
popup.classList.add("active");
}
function closePopup(){
popup.classList.remove("active");
}

// Clear
function clearFields(){
username.value="";
password.value="";
strengthBar.style.width="0";
}

// Toggle password
function togglePassword(){
let eye=document.getElementById("eyeIcon");
if(password.type==="password"){
password.type="text";
eye.innerText="🙈";
}else{
password.type="password";
eye.innerText="👁️";
}
}

// Strength
function checkStrength(){
let val=password.value;
let strength=0;

if(val.length>5) strength++;
if(/[A-Z]/.test(val)) strength++;
if(/[0-9]/.test(val)) strength++;

let colors=["red","orange","green"];
strengthBar.style.width=(strength*33)+"%";
strengthBar.style.background=colors[strength-1]||"red";
}

// History
function addHistory(user,status){
let time=new Date().toLocaleString();
let entry=`${user} - ${status} (${time})`;

historyData.push(entry);
localStorage.setItem("history",JSON.stringify(historyData));
}

// Display history
function displayHistory(){
let list=document.getElementById("historyList");
list.innerHTML="";

historyData.slice().reverse().forEach(item=>{
let li=document.createElement("li");
li.innerText=item;
list.appendChild(li);
});
}

// Main
async function handleAction(){
let user=username.value;
let pass=password.value;

if(user===""||pass===""){
showPopup("⚠ Fill all fields!");
return;
}

let hash=await hashPassword(pass);

if(!isLogin){

if(users[user]){
showPopup("⚠ Username exists!");
return;
}

users[user]=hash;
localStorage.setItem("users",JSON.stringify(users));

showPopup("🔐 Registered!\nHash:\n"+hash);
addHistory(user,"Registered");
clearFields();

}else{

if(users[user] && users[user]===hash){
showPopup("✅ Login Successful!");
addHistory(user,"Success");
clearFields();
}else{
showPopup("❌ Invalid Credentials!");
addHistory(user,"Failed");
}

}
}