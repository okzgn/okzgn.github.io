document.addEventListener('DOMContentLoaded', function () {
  var descriptions = document.querySelectorAll('.projects-container .description');
  descriptions.forEach(function (description) {
    description.addEventListener('click', toggleDescription);
    description.addEventListener('keydown', toggleByKeyboard);
  });

  var
    projectsContainer = document.querySelector('.projects-container'),
    projectsResponseContainer = document.querySelector('.projects-response'),
    alreadyRequestedProjects = localStorage.getItem('all-oss-projects'),
    alreadyRequestedProjectsDate = Number(localStorage.getItem('all-oss-projects-date') || 0),
    projectsDiffDate = (Date.now() > alreadyRequestedProjectsDate),
    projectsContent = '{"error":"Projects not found."}';

  if (projectsContainer && projectsResponseContainer &&
    (!alreadyRequestedProjects || !alreadyRequestedProjectsDate || projectsDiffDate)) {
    projectsResponseContainer.classList.add('loading');
    projectsResponseContainer.textContent = 'Updating...';

    _http({
      url: 'https://api.github.com/users/okzgn/repos?sort=pushed&per_page=30',
      onSuccess: function (r) {
        projectsContent = r;
        localStorage.setItem('all-oss-projects', projectsContent);
        localStorage.setItem('all-oss-projects-date', Date.now() + 86400000);
        showProjects(projectsContainer, projectsResponseContainer, projectsContent);
      },
      onError: function (e) {
        projectsContent = '{"error":"' + e.message + '"}';
        localStorage.setItem('all-oss-projects', projectsContent);
        localStorage.setItem('all-oss-projects-date', Date.now() + 600000);
        showProjects(projectsContainer, projectsResponseContainer, projectsContent);
      }
    });
  }
  else if (alreadyRequestedProjects) {
    setTimeout(function () {
      showProjects(projectsContainer, projectsResponseContainer, alreadyRequestedProjects);
    }, 2345);
  }
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

  if (projects.error || !projects.length) {
    if (!projects.length) {
      projects.error = 'Cannot update projects list (empty).';
    }

    responseContainer.classList.add('error');
    responseContainer.textContent = projects.error;
    return;
  }

  responseContainer.classList.add('hidden');
  container.textContent = '';

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
      detailsItem = document.createElement('div'),
      languageItem = document.createElement('code'),
      descriptionItem = document.createElement('span');

    titleBoxItem.id = projects[i].name;

    titleItem.className = 'link pill-link';
    titleItem.textContent = projects[i].name;
    titleItem.href = projects[i].html_url;
    titleItem.target = "_blank";
    titleItem.rel = "noopener noreferrer";

    languageItem.className = 'tag language';
    languageItem.textContent = projects[i].language;

    detailsItem.className = 'details rounded-box';
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
