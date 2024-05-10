$(document).ready(function () {
  setupTagInput("add-publishers", updatePublishers);
  setupTagInput("subtract-publishers", updatePublishers);
  setupButtonAddition("add-btn", "add-publishers");
  setupButtonAddition("subtract-btn", "subtract-publishers");
  setupSlider();
  resetSliderToDefault(); // Call this function on page load to reset the slider.

  // Load the list of domains from the JSON file
  $.getJSON("domains.json", function (data) {
    var listOfDomains = data; // Assuming the JSON file contains an array of domain strings

    // Adding autocomplete to the input fields
let chunkedDomains = {};

// Preprocess the listOfDomains to chunk it
function preprocessDomains() {
  listOfDomains.sort();
  chunkedDomains = listOfDomains.reduce((acc, domain) => {
    const index = domain[0].toLowerCase(); // Adjust for more letters
    acc[index] = acc[index] || [];
    acc[index].push(domain);
    return acc;
  }, {});
}

// Call this function once to prepare the data
preprocessDomains();

$("#add-publishers, #subtract-publishers").autocomplete({
  source: function(request, response) {
    const searchTerm = request.term.toLowerCase();
    const firstChar = searchTerm[0];
    let matches = [];

    if (chunkedDomains[firstChar]) {
      var matcher = new RegExp("^" + $.ui.autocomplete.escapeRegex(request.term), "i");
      matches = $.grep(chunkedDomains[firstChar], function(item) {
        return matcher.test(item);
      });
    }

    response(matches);
  },
  select: function(event, ui) {
    addTag(ui.item.value, updatePublishers, this.id);
    this.value = "";
    return false;
  },
});

  });
  $("#refresh-button").on("click", function () {
    // Assuming `searchGDELT` or a similar function runs the main search
    const searchTerm = $("#search-term").val();
    const publishers = getPublishers();

    searchGDELT(searchTerm, publishers); // Adapt this call to match how you perform a search
  });
});

function setupButtonAddition(buttonId, inputId) {
  const button = document.getElementById(buttonId);
  button.addEventListener("click", function () {
    const inputField = document.getElementById(inputId);
    if (inputField.value.trim() !== "") {
      addTag(inputField.value.trim(), updatePublishers, inputId);
      inputField.value = "";
    }
  });
}

function setupTagInput(elementId, callback) {
  const inputField = document.getElementById(elementId);
  const container = document.createElement("div");
  container.className = "tag-container";

  inputField.addEventListener("keypress", function (event) {
    if (event.key === "Enter") {
      event.preventDefault();
      if (inputField.value.trim() !== "") {
        addTag(inputField.value.trim(), callback, elementId);
        inputField.value = "";
      }
    }
  });
  const button = document.getElementById(
    elementId.replace("publishers", "btn"),
  );
  button.parentNode.insertBefore(container, button.nextSibling);
}

function addTag(domain, callback, inputId) {
  const container = document
    .getElementById(inputId)
    .parentNode.querySelector(".tag-container");
  const tag = document.createElement("span");
  tag.className =
    "tag " + (inputId.includes("add") ? "tag-add" : "tag-subtract"); // Assign class based on inputId
  tag.textContent = domain;
  tag.addEventListener("click", function () {
    this.parentNode.removeChild(this);
    callback();
    //toggleRefreshButton(true);
  });
  container.appendChild(tag);
  callback();
  //toggleRefreshButton(true); // Show the refresh button
}

function setupSlider() {
  let timeout;
  const slider = document.getElementById("timespan-slider");
  const output = document.getElementById("timespan-value");
  slider.oninput = function () {
    output.value = this.value;
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      updatePublishers();
      //toggleRefreshButton(true);
    }, 500); // Wait for 500ms to update
  };
}

document.addEventListener("DOMContentLoaded", function () {
  setupTagInput("add-publishers", updatePublishers);
  setupTagInput("subtract-btn", updatePublishers);
  setupButtonAddition("add-btn", "add-publishers");
  setupButtonAddition("subtract-btn", "subtract-publishers");
  setupSlider();
  resetSliderToDefault(); // Call this function on page load to reset the slider.
});

function resetSliderToDefault() {
  const slider = document.getElementById("timespan-slider");
  const output = document.getElementById("timespan-value");
  const defaultValue = 8; // Default value for the slider
  slider.value = defaultValue;
  output.value = defaultValue; // Make sure this reflects in the output display
  updatePublishers(); // Refresh publisher listing based on the default value
}

function updatePublishers() {
  const addContainer = document
    .getElementById("add-publishers")
    .parentNode.querySelector(".tag-container");
  const subtractContainer = document
    .getElementById("subtract-publishers")
    .parentNode.querySelector(".tag-container");
  const addTags = Array.from(addContainer.children).map(
    (tag) => tag.textContent,
  );
  const subtractTags = Array.from(subtractContainer.children).map(
    (tag) => tag.textContent,
  );
  const limit = document.getElementById("timespan-value").textContent; // Get the value from the slider output
  const apiUrl = `./apiv1?pos_domains=${addTags.join(",")}&neg_domains=${subtractTags.join(",")}&limit=${limit}`;

  fetch(apiUrl)
    .then((response) => response.json())
    .then((data) => {
      const similarContainer = document.getElementById("similar-domains");
      similarContainer.innerHTML = "";
      if (data.similar && data.similar.length > 0) {
        toggleRefreshButton(true); // Call your function here
      }
      data.similar.forEach((item) => {
        const tag = document.createElement("span");
        tag.className = "tag";
        tag.textContent = item.domain;
        tag.title = `Score: ${item.score.toFixed(2)}`;

        const scoreBtns = document.createElement("div");
        scoreBtns.className = "score-btns";

        const addBtn = document.createElement("span");
        addBtn.className = "score-btn score-plus";
        addBtn.textContent = "+";
        addBtn.onclick = () => {
          document.getElementById("add-publishers").value = item.domain;
          addTag(item.domain, updatePublishers, "add-publishers");
        };

        const subtractBtn = document.createElement("span");
        subtractBtn.className = "score-btn score-minus";
        subtractBtn.textContent = "-";
        subtractBtn.onclick = () => {
          document.getElementById("subtract-publishers").value = item.domain;
          addTag(item.domain, updatePublishers, "subtract-publishers");
        };

        tag.prepend(subtractBtn);
        tag.append(addBtn);
        similarContainer.appendChild(tag);
      });
    })
    .catch((error) => console.error("Error:", error));
}

//gdelt acquisition script
document.addEventListener("DOMContentLoaded", function () {
  setup();
});

function setup() {
  let lastClickTime = 0;
  document
    .getElementById("search-button")
    .addEventListener("click", function () {
      const currentTime = new Date().getTime();
      if (currentTime - lastClickTime < 2000) {
        // Prevent function run if less than a second
        console.log("Please wait a second before another search.");
        return;
      }
      lastClickTime = currentTime;
      const searchTerm = document.getElementById("search-term").value;
      const publishers = getPublishers();
      searchGDELT(searchTerm, publishers);
    });
}

function getPublishers() {
  // This selector should be updated to specifically target only the added publishers
  const addTagsContainer = document
    .querySelector("#add-publishers")
    .parentNode.querySelector(".tag-container");
  const addTags = addTagsContainer
    ? addTagsContainer.querySelectorAll(".tag")
    : [];
  const addDomains = Array.from(addTags).map(
    (tag) => `domainis:${tag.textContent.trim().replace(/^-|-\+$/, "")}`,
  );

  // Assuming similar publishers are displayed in a container with an id 'similar-domains'
  // and you want to include them in your search
  const similarTagsContainer = document.querySelector("#similar-domains");
  const similarTags = similarTagsContainer
    ? similarTagsContainer.querySelectorAll(".tag")
    : [];
  const similarDomains = Array.from(similarTags).map(
    (tag) => `domainis:${tag.textContent.trim().replace(/^-|-\+$/, "")}`,
  );

  // Combine both add and similar domains, considering removing duplicates if necessary
  const allDomains = [...new Set([...addDomains, ...similarDomains])];

  return allDomains.join(" OR ");
}

function searchGDELT(query, domains) {
  const baseURL = "https://api.gdeltproject.org/api/v2/doc/doc";
  let allDomains = domains ? domains.split(" OR ") : [];
  let calls = [];

  // Split large domain queries into chunks
  while (allDomains.length > 0) {
    let currentQuery = `query=${query} `;
    if (allDomains.length > 1) {
      currentQuery += " AND (";
    }
    let currentIndex = 0;

    while (
      currentIndex < allDomains.length &&
      currentQuery.length + allDomains[currentIndex].length + 4 <= 250
    ) {
      // "+4" accounts for ") OR "
      currentQuery +=
        (currentIndex > 0 ? " OR " : "") + allDomains[currentIndex];
      currentIndex++;
    }

    if (allDomains.length > 1) {
      currentQuery += ")";
    }
    currentQuery += `&mode=artlist&maxrecords=20&timespan=7days&sort=datedesc&format=json`;
    allDomains = allDomains.slice(currentIndex);
    calls.push(fetch(`${baseURL}?${currentQuery}`));
  }

  // If no domains, just fetch with the query
  if (calls.length === 0) {
    let currentQuery = `query=${query}&mode=artlist&maxrecords=20&timespan=7days&sort=datedesc&format=json`;
    calls.push(fetch(`${baseURL}?${currentQuery}`));
  }

  // Aggregate all calls
  Promise.all(calls)
    .then((responses) => Promise.all(responses.map((resp) => resp.json())))
    .then((datas) => {
      let aggregatedArticles = datas.flatMap((data) => data.articles);
      // Sort articles by datetime in descending order before displaying
      aggregatedArticles.sort(
        (a, b) =>
          new Date(
            b.seendate.replace(
              /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/,
              "$1-$2-$3T$4:$5:$6Z",
            ),
          ) -
          new Date(
            a.seendate.replace(
              /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/,
              "$1-$2-$3T$4:$5:$6Z",
            ),
          ),
      );
      displayArticles(aggregatedArticles);
      toggleRefreshButton(false);
    })
    .catch((error) => console.error("Error fetching GDELT data:", error));
  toggleRefreshButton(false);
}

function displayArticles(articles) {
  const articlesContainer =
    document.getElementById("articles-list") || createArticlesContainer();
  articlesContainer.innerHTML = ""; // Clear existing articles

  articles.forEach((article, index) => {
    const timeAgo = calculateTimeAgo(article.seendate);
    const articleHTML = `
                    <div style="align-items:center; padding: 0.2rem !important;"  class="media border p-3">
                        <img src="${article.socialimage}" class="mr-3 mt-3" style="margin-top: 0 !important; margin-left: 0.3rem !important; width:120px; height:100px; object-fit: cover; border-radius: 5px;"  onerror="this.src='https:///i.imgur.com/hfM1J8s.png'";this.style.display='none';">
                        <div class="media-body">
                            <p style="margin-bottom:0.2rem;">   ${article.domain}</p>
                            <h5><a href="${article.url}" target="_BLANK">${article.title}</a></h5>
                            <a><i>${timeAgo} ago</i></a>
                            <p  style="color:grey; font-size:0.7rem;">
                                 ${article.language} - ${article.sourcecountry}
                            </p>
                        </div>
                    </div>
                `;
    articlesContainer.innerHTML += articleHTML;
  });
}

function createArticlesContainer() {
  const container = document.createElement("ul");
  container.id = "articles-list";
  container.className = "articles-list";
  container.style.cssText = "padding-left:0px;";
  const wrapper = document.querySelector(".wrapper"); // Select the .wrapper element
  wrapper.appendChild(container); // Append to .wrapper if
  return container;
}

function calculateTimeAgo(rawTimeStampStr) {
  const timeStampStr = rawTimeStampStr.replace(
    /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/,
    "$1-$2-$3T$4:$5:$6Z",
  );
  const timeStamp = new Date(timeStampStr);
  var now = new Date(),
    secondsPast = (now.getTime() - timeStamp.getTime()) / 1000;
  if (secondsPast < 60) {
    return secondsPast + "s";
  }
  if (secondsPast < 3600) {
    return parseInt(secondsPast / 60) + "min";
  }
  if (secondsPast <= 86400) {
    return parseInt(secondsPast / 3600) + "h";
  }
  if (secondsPast <= 2628000) {
    return parseInt(secondsPast / 86400) + "d";
  }
  if (secondsPast <= 31536000) {
    return parseInt(secondsPast / 2628000) + "mo";
  }
  if (secondsPast > 31536000) {
    return parseInt(secondsPast / 31536000) + "y";
  }
}
function toggleRefreshButton(show) {
  const refreshContainer = document.getElementById("refresh-container");
  if (show) {
    refreshContainer.style.display = ""; // Make it visible
  } else {
    refreshContainer.style.display = "none"; // Hide it
  }
}
