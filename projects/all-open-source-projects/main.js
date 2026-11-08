/* All open source projects: lists the public repositories from the GitHub API, cached in localStorage.
   The page ships a static copy of the list (for search engines and visitors without JavaScript). */

// Hides that static copy until the fresh list is ready, so the page shows "Updating..." instead of
// flashing the old cards. This runs before the first paint: the script is loaded without defer.
document.documentElement.classList.add('projects-js');

var
  PROJECTS_CACHE_KEY = 'okzgn-projects-v2',
  PROJECTS_CACHE_TTL = 86400000, // 24 h for a good response
  PROJECTS_ERROR_TTL = 600000;   // 10 min for an error

// Returns the cached list while it is fresh. This page is the only user of localStorage on the site
// (see the privacy statement), so any other entry is a leftover of an older version of this cache
// (other keys, or the whole API response) and is removed; an expired entry is removed too.
function readProjectsCache() {
  try {
    for (var i = localStorage.length - 1; i >= 0; i--) {
      var key = localStorage.key(i);
      if (key !== PROJECTS_CACHE_KEY) { localStorage.removeItem(key); }
    }

    var cache = JSON.parse(localStorage.getItem(PROJECTS_CACHE_KEY) || 'null');
    if (cache && cache.content && cache.expires > Date.now()) { return cache.content; }
    localStorage.removeItem(PROJECTS_CACHE_KEY);
  }
  catch (e) {}
  return null;
}

function writeProjectsCache(content, ttl) {
  try {
    localStorage.setItem(PROJECTS_CACHE_KEY, JSON.stringify({ expires: Date.now() + ttl, content: content }));
  }
  catch (e) {}
}

// Keeps only the fields the list shows, not the whole API payload (about 150 KB for 30 repositories).
function trimProjects(response) {
  try {
    var repos = JSON.parse(response);
    if (!Array.isArray(repos)) { return response; }
    return JSON.stringify(repos.map(function (repo) {
      return {
        name: repo.name,
        html_url: repo.html_url,
        language: repo.language,
        topics: repo.topics,
        description: repo.description
      };
    }));
  }
  catch (e) {
    return response;
  }
}

document.addEventListener('DOMContentLoaded', function () {
  var descriptions = document.querySelectorAll('.projects-container .description');
  descriptions.forEach(function (description) {
    description.addEventListener('click', toggleDescription);
    description.addEventListener('keydown', toggleByKeyboard);
  });

  var
    projectsContainer = document.querySelector('.projects-container'),
    projectsResponseContainer = document.querySelector('.projects-response'),
    cachedProjects = readProjectsCache();

  if (!projectsContainer || !projectsResponseContainer) { return; }

  projectsResponseContainer.classList.add('loading');
  projectsResponseContainer.textContent = 'Updating...';

  if (cachedProjects) {
    setTimeout(function () {
      showProjects(projectsContainer, projectsResponseContainer, cachedProjects);
    }, 2345);
    return;
  }

  // Without the HTTP helper (estructura.okzgn.com did not load) there is nothing to wait for.
  if (typeof _http !== 'function') {
    showProjects(projectsContainer, projectsResponseContainer, '{"error":"Cannot load the projects list right now."}');
    return;
  }

  _http({
    url: 'https://api.github.com/users/okzgn/repos?sort=pushed&per_page=30',
    onSuccess: function (r) {
      var projectsContent = trimProjects(r);
      writeProjectsCache(projectsContent, PROJECTS_CACHE_TTL);
      showProjects(projectsContainer, projectsResponseContainer, projectsContent);
    },
    onError: function (e) {
      var projectsContent = JSON.stringify({ error: e.message });
      writeProjectsCache(projectsContent, PROJECTS_ERROR_TTL);
      showProjects(projectsContainer, projectsResponseContainer, projectsContent);
    }
  });
});

function toggleByKeyboard(e) {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    toggleDescription.call(this, e);
  }
}

function toggleDescription (e) {
  e.preventDefault();
  if (this.classList.contains('collapsed')){
      this.setAttribute('aria-expanded', 'true');
      this.classList.remove('collapsed');
      return;
  }
  this.setAttribute('aria-expanded', 'false');
  this.classList.add('collapsed');
}

function showProjects(container, responseContainer, projects){
  try {
    projects = JSON.parse(projects);
  }
  catch (e) {
    projects = { error: 'Cannot read the projects (JSON).' };
  }

  responseContainer.classList.remove('loading');

  // On error, the message shows above the static copy of the list, which is revealed again.
  if (projects.error || !projects.length) {
    if (!projects.error) {
      projects.error = 'Cannot update projects list (empty).';
    }

    responseContainer.classList.add('error');
    responseContainer.textContent = projects.error;
    container.classList.add('is-ready');
    return;
  }

  responseContainer.classList.add('hidden');
  container.textContent = '';
  container.classList.add('is-ready');

  createProjectsLinks('Modern Projects', container, projects, [], ['website', 'software-preservation']);
  createProjectsLinks('Old Projects', container, projects, ['software-preservation'], ['website'], true);

  if (typeof window['_TOC_OBSERVER_RESET'] === 'function'){
    window['_TOC_OBSERVER_RESET']();
  }
}

function createProjectsLinks(title, projectsContainer, projects, included, excluded, hr) {
  var
    container = document.createElement('ul'),
    sectionItem = document.createElement('h2');

  sectionItem.textContent = title;

  container.className = 'projects-list';

  if (hr) {
    hr = document.createElement('hr');
    projectsContainer.appendChild(hr);
  }

  projectsContainer.appendChild(sectionItem);
  projectsContainer.appendChild(container);

  var total = 0;
  for (var i = 0; i < projects.length; i++) {
    var
      topics = projects[i].topics && projects[i].topics.length,
      _topics = new Set(topics ? projects[i].topics : []);

    if (topics) {
      if ((included && included.length && !haveTopic(_topics, included, true))
        || (excluded && excluded.length && haveTopic(_topics, excluded, false))) {
        continue;
      }
    }

    total++;

    var
      listItem = document.createElement('li'),
      titleBoxItem = document.createElement('h3'),
      titleItem = document.createElement('a'),
      titleTextItem = document.createElement('span'),
      detailsItem = document.createElement('div'),
      languageItem = document.createElement('code'),
      descriptionItem = document.createElement('span');

    titleBoxItem.id = projects[i].name;

    titleItem.className = 'link pill-link';
    titleTextItem.textContent = projects[i].name;
    titleItem.appendChild(titleTextItem);
    titleItem.href = projects[i].html_url;
    titleItem.target = "_blank";
    titleItem.rel = "noopener noreferrer";

    languageItem.className = 'tag language';
    languageItem.textContent = projects[i].language;

    detailsItem.className = 'details';
    if (projects[i].language) { detailsItem.appendChild(languageItem); }

    var
      filteredTopics = (topics ? projects[i].topics.filter(function (topic) { return (topic !== (projects[i].language || '').toLowerCase() ? topic : ''); }) : []),
      k = filteredTopics.length;

    while(k--){
      var topicItem = document.createElement('code');
      topicItem.className = 'tag topic';
      topicItem.textContent = filteredTopics[k];
      detailsItem.appendChild(topicItem);
    }

    descriptionItem.setAttribute('tabindex', '0');
    descriptionItem.setAttribute('role', 'button');
    descriptionItem.setAttribute('aria-expanded', 'false');
    descriptionItem.className = 'description badge-marker collapsed';
    descriptionItem.textContent = projects[i].description;
    descriptionItem.addEventListener('click', toggleDescription);
    descriptionItem.addEventListener('keydown', toggleByKeyboard);

    listItem.className = 'inset-card';
    titleBoxItem.className = 'title';
    titleBoxItem.appendChild(titleItem);
    listItem.appendChild(titleBoxItem);
    listItem.appendChild(descriptionItem);
    listItem.appendChild(detailsItem);

    container.appendChild(listItem);
  }

  var totalItem = document.createElement('strong');
  totalItem.className = 'total';
  totalItem.textContent = 'Total:';
  sectionItem.insertAdjacentElement('afterend', totalItem);

  var totalValue = document.createElement('b');
  totalValue.textContent = total;
  totalItem.appendChild(totalValue);

}

function haveTopic(_topics, list, condition) {
  var j = list.length, condition = (!condition ? false : 0);
  while (j--) {
    if (_topics.has(list[j])){
      if (!condition) {
        return true;
      }
      condition++;
    }
  }

  return (condition === list.length ? true : false)
}
