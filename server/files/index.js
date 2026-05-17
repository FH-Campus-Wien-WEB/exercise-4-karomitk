import { ButtonBuilder, ElementBuilder, MovieBuilder } from "./builders.js";

// Externalized message strings
const messages = {
  dataLoadError: 'Daten konnten nicht geladen werden, Status',
  movieAlreadyInCollection: 'Film bereits in der Sammlung.',
  addMovieFailed: 'Hinzufügen des Films ist fehlgeschlagen.',
  deleteMovieFailed: 'Film konnte nicht gelöscht werden.',
  noResultsFound: 'Keine Ergebnisse gefunden.',
  searchFailed: 'Die Suche ist fehlgeschlagen...',
  loggedOutGreeting: 'Bitte logge dich ein, um deine Filmkollektion zu sehen.',
  loginFailed: 'Login failed'
};

let currentSession = null;

function updateGenres() {
  const header = document.querySelector('nav>h2');
  const listElement = document.querySelector("#filter");

  listElement.innerHTML = '';

  if (!currentSession) {
    header.style.display = 'none';
    return;
  }

  fetch("/genres", {
    credentials: "same-origin"
  })
    .then(response => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then(genres => {
      header.style.display = 'block';
      new ElementBuilder("li").append(new ButtonBuilder("All").onclick(() => loadMovies()))
        .appendTo(listElement);

      for (const genre of genres) {
        new ElementBuilder("li").append(new ButtonBuilder(genre).onclick(() => loadMovies(genre)))
          .appendTo(listElement);
      }

      const firstButton = listElement.querySelector("button");
      if (firstButton) {
        firstButton.click();
      }
    })
    .catch(error => {
      console.error('Failed to load genres:', error);
      listElement.append(`${messages.dataLoadError} ${error.message}`);
    });
}

function removeMovies() {
  const mainElement = document.querySelector("main");
  while (mainElement.childElementCount > 0) {
    mainElement.firstChild.remove();
  }
}

function loadMovies(genre) {
  const url = new URL("/movies", location.href);
  if (genre) {
    url.searchParams.set("genre", genre);
  }

  fetch(url, { credentials: "same-origin" })
    .then(response => {
      removeMovies();
      const mainElement = document.querySelector("main");

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then(movies => {
      const mainElement = document.querySelector("main");
      movies.forEach(movie => new MovieBuilder(movie, deleteMovie, Boolean(currentSession)).appendTo(mainElement));
    })
    .catch(error => {
      console.error('Failed to load movies:', error);
      const mainElement = document.querySelector("main");
      mainElement.append(`${messages.dataLoadError} ${error.message}`);
    });
}

function addMovie(imdbID) {
  return fetch(`/movies/${imdbID}`, {
    method: "PUT",
    credentials: "same-origin"
  })
    .then(response => {

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      if (response.status === 201) {
        loadMovies();
        updateGenres();
        return true;
      }

      if (response.status === 200) {
        alert(messages.movieAlreadyInCollection);
        return false;
      }

      return false;
    })
    .catch(error => {
      console.error('Failed to add movie:', error);
      alert(messages.addMovieFailed);
      return false;
    });
}

function deleteMovie(imdbID) {
  fetch(`/movies/${imdbID}`, {
    method: "DELETE",
    credentials: "same-origin"
  })
    .then(response => {
      if (response.ok) {
        const article = document.getElementById(imdbID);
        if (article) {
          article.remove();
        }
        updateGenres();
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    })
    .catch(error => {
      console.error('Failed to delete movie:', error);
      alert(messages.deleteMovieFailed);
    });
}

function searchMovies(query) {
  fetch(`/search?query=${encodeURIComponent(query)}`, {
    credentials: "same-origin"
  })
    .then(async response => {
      console.log("SEARCH SESSION:", currentSession);
      if (!response.ok) {
        const text = await response.text();
        console.error("SEARCH FAILED RESPONSE:", response.status, text);
        throw new Error(`HTTP ${response.status}`);
      }
      return response.json();
    })
    .then(results => {

      const resultsDiv = document.getElementById("searchResults");
      resultsDiv.innerHTML = '';

      // No results
      if (!results || results.length === 0) {

        new ElementBuilder("p")
          .text(messages.noResultsFound)
          .appendTo(resultsDiv);

        return;
      }

      // Render results
      results.forEach(movie => {

        const container = document.createElement("div");

        // Title + year
        const text = document.createElement("span");
        text.textContent = `${movie.Title} (${movie.Year})`;

        // Add button
        const button = document.createElement("button");
        button.textContent = "Add";

        button.onclick = () => {

          addMovie(movie.imdbID)
            .then(success => {

              // remove from search results after successful add
              if (success) {
                container.remove();
              }

            });

        };

        container.appendChild(text);
        container.appendChild(button);

        resultsDiv.appendChild(container);

      });
    })
    .catch(error => {
      console.error('Search failed:', error);

      const resultsDiv = document.getElementById("searchResults");

      new ElementBuilder("p")
        .text(messages.searchFailed)
        .appendTo(resultsDiv);
    });
}

function renderUserGreeting() {
  const greetingElement = document.getElementById('userGreeting');
  // Task 1.2: Render a user greeting to `#userGreeting` 
  // using `firstName`, `lastName`, and the server-provided
  // login timestamp.

  if (!currentSession) {
    greetingElement.textContent = "";
    return;
  }

  const loginDate = new Date(currentSession.loginTime);

  const formattedDate = loginDate.toLocaleDateString("de-DE", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });

  const formattedTime = loginDate.toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit"
  });

  greetingElement.textContent =
    `Hi ${currentSession.firstName} ${currentSession.lastName}, ` +
    `du hast dich am ${formattedDate} um ${formattedTime} angemeldet.`;
}

window.onload = function () {
  // Check session
  fetch("/session", { credentials: "same-origin" })
    .then(response => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then(data => {
      currentSession = data || null;
      updateUI();
    })
    .catch(error => {
      console.error('Failed to load session:', error);
      currentSession = null;
      updateUI();
    });


}

function updateUI() {
  const authBtn = document.getElementById('authBtn');
  const addMoviesBtn = document.getElementById('addMoviesBtn');

  renderUserGreeting();
  updateGenres();

  if (currentSession) {
    authBtn.textContent = 'Logout';
    authBtn.onclick = () => {
      fetch("/logout", {
        credentials: "same-origin"
      })
        .then(response => {
          if (response.ok) {
            currentSession = null;
            updateUI();
          }
        })
        .catch(error => {
          console.error('Logout failed:', error);
        });
    };
    addMoviesBtn.style.display = 'inline';
  } else {
    removeMovies();
    authBtn.textContent = 'Login';
    authBtn.onclick = () => {
      const loginForm = document.getElementById('loginForm');
      loginForm.reset();
      document.getElementById('loginDialog').showModal();
    };
    addMoviesBtn.style.display = 'none';
  }
}

// Login dialog
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData(e.target);

  // Task 1.1: Implement the login submit flow to call `POST /login` 
  // with username and password, handle errors, save the response 
  // into `currentSession`, then call `updateUI()` and `loadMovies()`.
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  try {
    const response = await fetch("/login", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    })

    if (!response.ok) {
      throw new Error("Invalid username or password");
    }

    currentSession = await response.json();

    document.getElementById("loginDialog").close();

    updateUI();
    loadMovies();

  } catch (err) {
    alert(err.message);
  }

});

document.getElementById('cancelLogin').addEventListener('click', () => {
  document.getElementById('loginDialog').close();
});

// Search dialog
document.getElementById('addMoviesBtn').addEventListener('click', () => {
  const searchForm = document.getElementById('searchForm');
  searchForm.reset();
  document.getElementById('searchResults').innerHTML = '';
  document.getElementById('searchDialog').showModal();
});

document.getElementById('searchForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const query = document.getElementById('query').value;
  searchMovies(query);
});

document.getElementById('cancelSearch').addEventListener('click', () => {
  document.getElementById('searchDialog').close();
});


