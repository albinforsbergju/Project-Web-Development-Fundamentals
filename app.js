const express = require("express");
const expressHandlebars = require("express-handlebars");
const dummyData = require("./dummyData");
const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("blog.db");

db.run(
    "CREATE TABLE IF NOT EXISTS posts (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, subtitle TEXT, content TEXT)"
);

const app = express();

app.engine(
    "hbs",
    expressHandlebars.engine({
        defaultLayout: "main.hbs",
    })
);

app.use(express.static("public"));
app.use("/css", express.static(__dirname + "/node_modules/bootstrap/dist/css"));
app.use(express.urlencoded({ extended: false }));

function mdToHtml(md) {
    const html = md
        .replace(/^### (.*)$/gm, "<h3>$1</h3>")
        .replace(/^## (.*)$/gm, "<h2>$1</h2>")
        .replace(/^# (.*)$/gm, "<h1>$1</h1>")
        .replace(/\*\*(.*)\*\*/gm, "<strong>$1</strong>")
        .replace(/\*(.*)\*/gm, "<em>$1</em>")
        .replace(/\[(.*)\]\((.*)\)/gm, "<a href='$2'>$1</a>")
        .replace(/^(.*)$/gm, "<p>$1</p>");

    return html;
}

app.get("/", (request, response) => {
    response.render("start.hbs");
});

app.get("/posts", (request, response) => {
    const query = "SELECT * FROM posts";

    db.all(query, (error, posts) => {
        if (error) {
            console.log(error);
            response.status(500).send("Something went wrong");
        } else {
            response.render("posts.hbs", {
                posts: posts,
            });
        }
    });
});

app.get("/posts/create", (request, response) => {
    response.render("createPost.hbs");
});

app.post("/posts/create", (request, response) => {
    const query =
        "INSERT INTO posts (title, subtitle , content) VALUES (?, ?, ?)";

    db.run(
        query, [request.body.title, request.body.subtitle, request.body.content],
        (error) => {
            if (error) {
                console.log(error);
            } else {
                response.redirect("/posts");
            }
        }
    );
});

app.get("/posts/:id", (request, response) => {
    const id = request.params.id;

    const query = "SELECT * FROM posts WHERE id = " + id;

    db.get(query, (error, post) => {
        if (error) {
            console.log(error);
        } else {
            response.render("post.hbs", {
                post: {
                    title: post.title,
                    content: mdToHtml(post.content),
                },
            });
        }
    });
});

app.get("/contact", (request, response) => {
    response.render("contact.hbs");
});

app.get("/about", (request, response) => {
    response.render("about.hbs", { title: "About" });
});

app.get("/projects", (request, response) => {
    response.render("projects.hbs");
});

app.listen(8081);