const express = require("express");
const expressHandlebars = require("express-handlebars");
const expressSession = require("express-session");
const dummyData = require("./dummyData");
const sqlite3 = require("sqlite3").verbose();

const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "password";

const db = new sqlite3.Database("blog.db");

db.run(
    "CREATE TABLE IF NOT EXISTS posts (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, subtitle TEXT, content TEXT, date DATE)"
);

db.run(
    "CREATE TABLE IF NOT EXISTS postComment (id INTEGER PRIMARY KEY AUTOINCREMENT, content TEXT, userName TEXT, postId INTEGER, date DATE, FOREIGN KEY(postId) REFERENCES posts(id))"
);

const app = express();

app.engine(
    "hbs",
    expressHandlebars.engine({
        defaultLayout: "main.hbs",
    })
);
app
    .use(express.static("public"))
    .use("/css", express.static(__dirname + "/node_modules/bootstrap/dist/css"))
    .use(express.urlencoded({ extended: false }))
    .use(
        expressSession({
            secret: "secret",
            resave: false,
            saveUninitialized: false,
        })
    )
    .use(function(request, response, next) {
        response.locals.session = request.session;
        next();
    });

function mdToHtml(md) {
    const html = md
        .replace(/^##### (.*)/gm, "<h5>$1</h5>")
        .replace(/^#### (.*)/gm, "<h4>$1</h4>")
        .replace(/^### (.*)$/gm, "<h3>$1</h3>")
        .replace(/^## (.*)$/gm, "<h2>$1</h2>")
        .replace(/^# (.*)$/gm, "<h1>$1</h1>")
        .replace(/\*\*(.*)\*\*/gm, "<strong>$1</strong>")
        .replace(/\*(.*)\*/gm, "<em>$1</em>")
        .replace(/!\[(.*)\]\((.*)\)/gm, "<img src='$2' alt='$1' />")
        .replace(/\[(.*)\]\((.*)\)/gm, "<a href='$2'>$1</a>")
        .replace(/^- (.*)/gm, "<li>$1</li>")
        .replace(/^(.*)$/gm, "<p>$1</p>");

    return html;
}

app.get("/", (request, response) => {
    const model = {
        session: request.session,
    };

    response.render("start.hbs", model);
});

app.get("/posts", (request, response) => {
    if (parseInt(request.query.page) < 1) {
        response.redirect("/posts?page=1");
    }

    let page = {
        previous: -1 + parseInt(request.query.page || 1),
        current: 0 + parseInt(request.query.page || 1),
        next: 1 + parseInt(request.query.page || 1),
        isMorePosts: true,
        isLessPosts: true,
    };

    const query =
        "SELECT * FROM posts ORDER BY id DESC LIMIT " +
        (page.current - 1) * 4 +
        ", 4";

    db.all(query, (error, posts) => {
        if (error) {
            console.log(error);
            response.status(500).send("Something went wrong");
        } else {
            if (posts.length < 4) {
                page.isMorePosts = false;
            }

            if (page.current == 1) {
                page.isLessPosts = false;
            }
            response.render("posts.hbs", {
                posts: posts,
                page: page,
            });
        }
    });
});

app.get("/posts/create", (request, response) => {
    response.render("createPost.hbs");
});

app.get("/posts/:id/edit", (request, response) => {
    const query = "SELECT * FROM posts WHERE id = ?";

    db.get(query, request.params.id, (error, post) => {
        if (error) {
            console.log(error);
            response.status(500).send("Something went wrong");
        } else {
            response.render("updatePost.hbs", {
                post: post,
            });
        }
    });
});

app.get("/posts/:id/delete", (request, response) => {
    const query = "SELECT id FROM posts WHERE id = ?";

    db.get(query, request.params.id, (error, post) => {
        if (error) {
            console.log(error);
            response.status(500).send("Something went wrong");
        } else {
            response.render("deletePost.hbs", {
                post: post,
            });
        }
    });
});

app.post("/posts/:id/delete", (request, response) => {
    const query = "DELETE FROM posts WHERE ID = ?";

    db.run(query, request.params.id, (error) => {
        if (error) {
            console.log(error);
            response.status(500).send("Something went wrong");
        } else {
            response.redirect("/posts");
        }
    });
});

app.post("/posts/:id/edit", (request, response) => {
    console.log(request.params);
    const query =
        "UPDATE posts SET title = ?, subtitle = ?, content = ? WHERE id = ?";

    db.run(
        query, [
            request.body.title,
            request.body.subtitle,
            request.body.content,
            request.params.id,
        ],
        (error) => {
            if (error) {
                console.log(error);
                response.status(500).send("Something went wrong");
            } else {
                response.redirect("/posts/" + request.params.id);
            }
        }
    );
});

app.post("/posts/create", (request, response) => {
    const query =
        "INSERT INTO posts (title, subtitle , content, date) VALUES (?, ?, ?, ?)";

    db.run(
        query, [
            request.body.title,
            request.body.subtitle,
            request.body.content,
            new Date(),
        ],
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

    const postQuery = "SELECT * FROM posts WHERE id = " + id;

    db.get(postQuery, (error, post) => {
        if (error) {
            console.log(error);
        } else {
            const commentQuery =
                "SELECT * FROM postComment WHERE postId = " +
                id +
                " ORDER BY date DESC";

            db.all(commentQuery, (error, comments) => {
                if (error) {
                    console.log(error);
                } else {
                    response.render("post.hbs", {
                        post: {
                            id: post.id,
                            title: post.title,
                            subtitle: post.subtitle,
                            content: mdToHtml(post.content),
                        },
                        comments: comments,
                    });
                }
            });
        }
    });
});

app.post("/posts/:id/comment", (request, response) => {
    const id = request.params.id;

    const query =
        "INSERT INTO postComment (content, userName, postId, date) VALUES (?, ?, ?, ?)";

    db.run(
        query, [request.body.content, request.body.userName, id, new Date()],
        (error) => {
            if (error) {
                console.log(error);
            } else {
                response.redirect("/posts/" + id);
            }
        }
    );
});

app.get("/search", (request, response) => {
    const query =
        "SELECT id, content, title, subtitle FROM posts WHERE content LIKE '%' || ? || '%' OR title LIKE '%' || ? || '%'";

    db.all(query, [request.query.search], (error, posts) => {
        response.render("search.hbs", {
            posts,
        });
    });
});

app.get("/login", (request, response) => {
    response.render("login.hbs");
});

app.post("/login", (request, response) => {
    const userName = request.body.username;
    const password = request.body.password;

    if (userName == ADMIN_USERNAME && password == ADMIN_PASSWORD) {
        request.session.loggedIn = true;
        response.redirect("/");
    } else {
        response.render("login.hbs", {
            isError: true,
            error: "Wrong username or password",
        });
    }
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

app.get("/projects/create", (request, response) => {
    response.render("createProject.hbs");
});

app.post("/projects/create", (request, response) => {
    response.redirect("/projects");
});

app.listen(3000, () => {
    console.log("Server started (http://localhost:3000/) !");
});