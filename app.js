const express = require('express');
const app = express();
const userModel = require('./models/user');
const postModel = require('./models/post');
const path = require('path');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');


app.set('view engine', 'ejs');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser());



app.get("/", (req, res) => {
    res.render('index');
})

app.get("/profile", isLoggedIn, async(req, res) => {
    let user = await userModel.findOne({ email: req.user.email }).populate("posts");
    console.log(user);
    res.render('profile',{user});
})

app.get("/login", (req, res) => {
    res.render('login');
})

app.post("/post", isLoggedIn, async(req, res) => {
    let user = await userModel.findOne({ email: req.user.email });
    let { content } = req.body;
    let post = await postModel.create({
        user: user._id,
        content
    })
    user.posts.push(post._id);
    await user.save();
    res.redirect("/profile");
})

app.post("/register", async(req, res) => {
    let { email, password, username, name, age } = req.body;
    let user = await userModel.findOne({ email });
    if (user) return res.status(500).send('User already regisered');

    bcrypt.genSalt(10, (err, salt) => {
        bcrypt.hash(password, salt, async(err, hash) => {
            let user = await userModel.create({
                username,
                name,
                email,
                password: hash,
                age
            });
            let token = jwt.sign({ email: email, userid: user._id }, 'secret');
            res.cookie('token', token);
            res.send('User registered');
        })
    })
})

app.post("/login", async(req, res) => {
    let { email, password } = req.body;

    let user = await userModel.findOne({ email });
    if (!user) return res.status(500).send('Something went wrong');
    
    bcrypt.compare(password, user.password, (err, result) => {
        if (result) {
            let token = jwt.sign({ email: email, userid: user._id }, 'secret');
            res.cookie('token', token);            
            res.status(200).redirect('/profile');
        }   
        else res.redirect("/login"); 
    })
})


app.get("/logout", (req, res) => {
    res.cookie('token', "");
    res.redirect("/login")
})


function isLoggedIn(req,res,next){
    if (req.cookies.token === "") {
        res.redirect("/login")
    }
    else {
        let data = jwt.verify(req.cookies.token, "secret");
        req.user = data;
        next();
    }
}
// const isLoggedIn = (req,res,next) => {
//     if (req.cookies.token === "") {
//         res.send('You must be logged in first')
//     }
//     else {
//         let data = jwt.verify(req.cookie.token, "secret");
//         req.user = data;
//     }
//     next();
// }


app.listen(3000)