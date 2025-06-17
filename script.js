document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM fully loaded and parsed. Initializing application...");

    let tasks = [];
    let categories = [];
    let nextTaskId = 1;
    let nextCategoryId = 1; 
    let editingTaskId = null;
    let editingCategoryId = null;
    let currentView = 'active';
    let currentDate = new Date();
    let selectedDateString = null;

    const TASKS_STORAGE_KEY = 'todo_tasks';
    const CATEGORIES_STORAGE_KEY = 'todo_categories';

    // DOM element selections
    const addTaskBtn = document.getElementById('add-task-btn');
    const taskInputModal = document.getElementById('task-input-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const taskForm = document.getElementById('task-form');
    const dailyTasksArea = document.getElementById('daily-tasks-area');
    const modalTitle = document.querySelector('#task-input-modal h2');
    const toggleViewBtn = document.getElementById('toggle-view-btn');
    const monthYearDisplay = document.getElementById('month-year-display');
    const calendarGrid = document.getElementById('calendar-grid');
    const prevMonthBtn = document.getElementById('prev-month-btn');
    const nextMonthBtn = document.getElementById('next-month-btn');
    const categorySelectElement = document.getElementById('task-category');
    const manageCategoriesBtn = document.getElementById('manage-categories-btn');
    const categoryManagementModal = document.getElementById('category-management-modal');
    const closeCategoryModalBtn = document.getElementById('close-category-modal-btn');
    const existingCategoriesListElement = document.getElementById('existing-categories-list');
    const addCategoryForm = document.getElementById('add-category-form');
    const addCategoryArea = document.getElementById('add-category-area');
    const editCategoryArea = document.getElementById('edit-category-area');
    const editCategoryForm = document.getElementById('edit-category-form');
    const cancelEditCategoryBtn = document.getElementById('cancel-edit-category-btn');
    const editCategoryIdInput = document.getElementById('edit-category-id');
    const editCategoryNameInput = document.getElementById('edit-category-name');
    const editCategoryColorBgInput = document.getElementById('edit-category-color-bg');
    const editCategoryColorTextInput = document.getElementById('edit-category-color-text');
    
    function getTodayDateString() {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // --- Category Functions ---
    function getDefaultCategories() {
        let tempNextCatId = 1;
        return [
            { id: `cat${tempNextCatId++}`, name: '仕事', color: '#007bff', textColor: '#ffffff' },
            { id: `cat${tempNextCatId++}`, name: '個人', color: '#28a745', textColor: '#ffffff' },
            { id: `cat${tempNextCatId++}`, name: '学習', color: '#ffc107', textColor: '#212529' },
            { id: `cat${tempNextCatId++}`, name: '急ぎ', color: '#dc3545', textColor: '#ffffff' },
            { id: `cat${tempNextCatId++}`, name: 'デフォルト', color: '#6c757d', textColor: '#ffffff' }
        ];
    }

    function loadCategories() {
        try {
            const storedCategories = localStorage.getItem(CATEGORIES_STORAGE_KEY);
            if (storedCategories) {
                categories = JSON.parse(storedCategories);
                if (categories.length > 0) {
                    const maxIdNum = Math.max(0, ...categories.map(cat => {
                        const idNum = parseInt(String(cat.id).replace('cat',''), 10);
                        return isNaN(idNum) ? 0 : idNum;
                    }));
                    nextCategoryId = maxIdNum + 1;
                } else {
                    categories = getDefaultCategories();
                    nextCategoryId = categories.length > 0 ? Math.max(0, ...categories.map(c => parseInt(String(c.id).replace('cat',''), 10))) + 1 : 1;
                    saveCategories();
                }
            } else {
                categories = getDefaultCategories();
                nextCategoryId = categories.length > 0 ? Math.max(0, ...categories.map(c => parseInt(String(c.id).replace('cat',''), 10))) + 1 : 1;
                saveCategories();
            }
        } catch (e) {
            console.error("localStorageからのカテゴリ読み込みに失敗しました:", e);
            categories = getDefaultCategories();
             nextCategoryId = categories.length > 0 ? Math.max(0, ...categories.map(c => parseInt(String(c.id).replace('cat',''), 10))) + 1 : 1;
        }
        populateCategorySelect();
    }

    function saveCategories() {
        try {
            localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(categories));
        } catch (e) {
            console.error("localStorageへのカテゴリ保存に失敗しました:", e);
        }
    }

    function populateCategorySelect(selectedCategoryName = '') {
        if (!categorySelectElement) return;
        categorySelectElement.innerHTML = '';
        let categoryExistsInList = false;
        categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.name;
            option.textContent = cat.name;
            if (cat.name === selectedCategoryName) {
                option.selected = true;
                categoryExistsInList = true;
            }
            categorySelectElement.appendChild(option);
        });
        if (!categoryExistsInList && selectedCategoryName) {
            const defaultCat = categories.find(c => c.name === "デフォルト");
            if (defaultCat) categorySelectElement.value = defaultCat.name;
            else if (categories.length > 0) categorySelectElement.value = categories[0].name;
        } else if (!selectedCategoryName && categories.length > 0) {
            const defaultCat = categories.find(c => c.name === "デフォルト");
            categorySelectElement.value = defaultCat ? defaultCat.name : categories[0].name;
        }
    }

    function getCategoryColor(categoryName) {
        const category = categories.find(cat => cat.name === categoryName);
        const defaultBgColor = '#6c757d';
        const defaultTextColor = '#ffffff';
        if (category) {
            return { 
                background: category.color || defaultBgColor, 
                text: category.textColor || defaultTextColor 
            };
        }
        return { background: defaultBgColor, text: defaultTextColor };
    }

    // --- Task Functions ---
    function loadTasks() {
        try {
            const storedTasks = localStorage.getItem(TASKS_STORAGE_KEY);
            if (storedTasks) {
                tasks = JSON.parse(storedTasks);
                if (tasks.length > 0) {
                    tasks.forEach(task => {
                        if (task.completionDate === undefined) task.completionDate = null;
                        if (typeof task.category === 'object' && task.category !== null && task.category.name) {
                            task.category = task.category.name;
                        } else if (task.category === undefined || task.category === null || !categories.some(c => c.name === task.category)) {
                            task.category = 'デフォルト';
                        }
                    });
                    nextTaskId = Math.max(0, ...tasks.map(task => task.id || 0)) + 1;
                } else {
                    nextTaskId = 1;
                }
            } else {
                tasks = [];
                nextTaskId = 1;
            }
        } catch (e) {
            console.error("localStorageからのタスク読み込みに失敗しました:", e);
            tasks = [];
            nextTaskId = 1;
        }
    }

    function saveTasks() {
        try {
            localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
        } catch (e) {
            console.error("localStorageへのタスク保存に失敗しました:", e);
        }
    }

    // --- Event Listeners for Task Modal ---
    if (addTaskBtn) {
        addTaskBtn.addEventListener('click', function() {
            if (taskInputModal) {
                editingTaskId = null;
                if (modalTitle) modalTitle.textContent = 'タスクを新規追加';
                if (taskForm) taskForm.reset();
                populateCategorySelect();
                taskInputModal.classList.add('is-visible');
            }
        });
    }

    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', function() {
            if (taskInputModal) {
                taskInputModal.classList.remove('is-visible');
            }
        });
    }

    if (taskInputModal) {
        taskInputModal.addEventListener('click', function(event) {
            if (event.target === taskInputModal) {
                taskInputModal.classList.remove('is-visible');
            }
        });
    }

    // --- Event Listener for Task Form Submission ---
    if (taskForm) {
        taskForm.addEventListener('submit', function(event) {
            event.preventDefault();
            const taskName = document.getElementById('task-name').value;
            const dueDate = document.getElementById('task-due-date').value;
            const priority = parseInt(document.getElementById('task-priority').value, 10);
            const category = categorySelectElement.value;
            const memo = document.getElementById('task-memo').value;
            if (taskName.trim() === '') {
                alert('タスク名を入力してください。');
                return;
            }
            if (editingTaskId !== null) {
                const taskToUpdate = tasks.find(t => t.id === editingTaskId);
                if (taskToUpdate) {
                    taskToUpdate.name = taskName;
                    taskToUpdate.dueDate = dueDate;
                    taskToUpdate.priority = priority;
                    taskToUpdate.category = category;
                    taskToUpdate.memo = memo;
                }
                editingTaskId = null;
            } else {
                const newTask = { id: nextTaskId++, name: taskName, dueDate: dueDate, priority: priority, category: category, memo: memo, completed: false, completionDate: null };
                tasks.push(newTask);
            }
            saveTasks();
            renderCalendar();
            renderTasks();
            taskForm.reset();
            populateCategorySelect();
            if (taskInputModal) taskInputModal.classList.remove('is-visible');
            if (modalTitle) modalTitle.textContent = 'タスクを新規追加';
        });
    }
    
    // --- Category Management Modal Functions & Listeners ---
    function openCategoryManagementModal() {
        if (categoryManagementModal) {
            renderCategoryManagementList();
            categoryManagementModal.classList.add('is-visible');
            if(addCategoryForm) {
                addCategoryForm.reset();
                document.getElementById('new-category-color-bg').value = '#6c757d';
                document.getElementById('new-category-color-text').value = '#ffffff';
            }
            if (editCategoryArea) editCategoryArea.style.display = 'none';
            if (addCategoryArea) addCategoryArea.style.display = 'block';
            editingCategoryId = null;
        }
    }

    function closeCategoryManagementModal() {
        if (categoryManagementModal) {
            categoryManagementModal.classList.remove('is-visible');
        }
    }

    function renderCategoryManagementList() {
        if (!existingCategoriesListElement) return;
        existingCategoriesListElement.innerHTML = '';
        if (categories.length === 0) {
            existingCategoriesListElement.innerHTML = '<li>登録されているカテゴリはありません。</li>';
            return;
        }
        categories.forEach(cat => {
            const li = document.createElement('li');
            const infoDiv = document.createElement('div');
            infoDiv.style.display = 'flex';
            infoDiv.style.alignItems = 'center';
            infoDiv.style.flexGrow = '1';
            const previewSpan = document.createElement('span');
            previewSpan.className = 'category-color-preview';
            previewSpan.style.backgroundColor = cat.color;
            infoDiv.appendChild(previewSpan);
            const nameSpan = document.createElement('span');
            nameSpan.textContent = cat.name;
            nameSpan.style.color = cat.textColor;
            nameSpan.style.backgroundColor = cat.color;
            nameSpan.style.padding = '2px 6px';
            nameSpan.style.borderRadius = '3px';
            nameSpan.style.marginLeft = '5px';
            infoDiv.appendChild(nameSpan);
            li.appendChild(infoDiv);
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'category-actions';
            const editBtn = document.createElement('button');
            editBtn.innerHTML = '<i class="fa-solid fa-pencil"></i>';
            editBtn.title = '編集';
            editBtn.className = 'edit-cat-btn';
            editBtn.setAttribute('data-id', cat.id);
            editBtn.addEventListener('click', () => handleEditCategory(cat.id));
            actionsDiv.appendChild(editBtn);
            const deleteBtn = document.createElement('button');
            deleteBtn.innerHTML = '<i class="fa-solid fa-trash"></i>';
            deleteBtn.title = '削除';
            deleteBtn.className = 'delete-cat-btn';
            deleteBtn.setAttribute('data-id', cat.id);
            deleteBtn.addEventListener('click', () => handleDeleteCategory(cat.id));
            if (cat.name === 'デフォルト') {
                deleteBtn.disabled = true;
                deleteBtn.title = 'デフォルトカテゴリは削除できません。';
            }
            actionsDiv.appendChild(deleteBtn);
            li.appendChild(actionsDiv);
            existingCategoriesListElement.appendChild(li);
        });
    }

    if (manageCategoriesBtn) {
        manageCategoriesBtn.addEventListener('click', openCategoryManagementModal);
    }
    if (closeCategoryModalBtn) {
        closeCategoryModalBtn.addEventListener('click', closeCategoryManagementModal);
    }
    if (categoryManagementModal) {
        categoryManagementModal.addEventListener('click', function(event) {
            if (event.target === categoryManagementModal) {
                closeCategoryManagementModal();
            }
        });
    }

    if (addCategoryForm) {
        addCategoryForm.addEventListener('submit', function(event) {
            event.preventDefault();
            const name = document.getElementById('new-category-name').value.trim();
            const colorBg = document.getElementById('new-category-color-bg').value;
            const colorText = document.getElementById('new-category-color-text').value;
            if (!name) {
                alert('カテゴリ名を入力してください。');
                return;
            }
            if (categories.some(cat => cat.name.toLowerCase() === name.toLowerCase())) {
                alert('同じ名前のカテゴリが既に存在します。');
                return;
            }
            const newCategory = { id: `cat${nextCategoryId++}`, name: name, color: colorBg, textColor: colorText };
            categories.push(newCategory);
            saveCategories();
            renderCategoryManagementList();
            populateCategorySelect();
            addCategoryForm.reset();
            document.getElementById('new-category-color-bg').value = '#6c757d'; 
            document.getElementById('new-category-color-text').value = '#ffffff';
        });
    }
    
    function handleEditCategory(categoryId) {
        editingCategoryId = categoryId;
        const categoryToEdit = categories.find(cat => cat.id === categoryId);
        if (!categoryToEdit) return;
        editCategoryIdInput.value = categoryToEdit.id;
        editCategoryNameInput.value = categoryToEdit.name;
        editCategoryColorBgInput.value = categoryToEdit.color;
        editCategoryColorTextInput.value = categoryToEdit.textColor;
        if (addCategoryArea) addCategoryArea.style.display = 'none';
        if (editCategoryArea) editCategoryArea.style.display = 'block';
    }

    if (cancelEditCategoryBtn) {
        cancelEditCategoryBtn.addEventListener('click', () => {
            if (editCategoryArea) editCategoryArea.style.display = 'none';
            if (addCategoryArea) addCategoryArea.style.display = 'block';
            editingCategoryId = null;
        });
    }

    if (editCategoryForm) {
        editCategoryForm.addEventListener('submit', function(event) {
            event.preventDefault();
            if (!editingCategoryId) return;
            const updatedName = editCategoryNameInput.value.trim();
            const updatedColorBg = editCategoryColorBgInput.value;
            const updatedColorText = editCategoryColorTextInput.value;
            if (!updatedName) {
                alert('カテゴリ名を入力してください。');
                return;
            }
            const categoryToUpdate = categories.find(cat => cat.id === editingCategoryId);
            if (!categoryToUpdate) return;
            if (categories.some(cat => cat.id !== editingCategoryId && cat.name.toLowerCase() === updatedName.toLowerCase())) {
                alert('同じ名前のカテゴリが既に存在します。');
                return;
            }
            const oldCategoryName = categoryToUpdate.name;
            categoryToUpdate.name = updatedName;
            categoryToUpdate.color = updatedColorBg;
            categoryToUpdate.textColor = updatedColorText;
            if (oldCategoryName !== updatedName) {
                tasks.forEach(task => {
                    if (task.category === oldCategoryName) {
                        task.category = updatedName;
                    }
                });
                saveTasks();
            }
            saveCategories();
            renderCategoryManagementList();
            populateCategorySelect();
            renderCalendar();
            renderTasks();
            if (editCategoryArea) editCategoryArea.style.display = 'none';
            if (addCategoryArea) addCategoryArea.style.display = 'block';
            editingCategoryId = null;
        });
    }
    
    function handleDeleteCategory(categoryId) {
        const categoryToDelete = categories.find(cat => cat.id === categoryId);
        if (!categoryToDelete) {
            alert('削除対象のカテゴリが見つかりません。');
            return;
        }
        if (categoryToDelete.name === 'デフォルト') {
            alert('「デフォルト」カテゴリは削除できません。');
            return;
        }
        if (confirm(`カテゴリ「${categoryToDelete.name}」を本当に削除しますか？\nこのカテゴリが設定されているタスクは「デフォルト」カテゴリに付け替えられます。`)) {
            const defaultCategory = categories.find(cat => cat.name === 'デフォルト');
            if (!defaultCategory) {
                alert('「デフォルト」カテゴリが見つからないため、削除処理を中断しました。');
                return;
            }
            let tasksUpdated = false;
            tasks.forEach(task => {
                if (task.category === categoryToDelete.name) {
                    task.category = defaultCategory.name;
                    tasksUpdated = true;
                }
            });
            if (tasksUpdated) {
                saveTasks();
            }
            categories = categories.filter(cat => cat.id !== categoryId);
            saveCategories();
            renderCategoryManagementList();
            populateCategorySelect();
            renderCalendar();
            renderTasks();
            console.log(`Category "${categoryToDelete.name}" deleted.`);
        }
    }

    // --- Calendar Rendering ---
    function renderCalendar() {
        if (!calendarGrid || !monthYearDisplay) return;
        calendarGrid.innerHTML = '';
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        monthYearDisplay.textContent = `${year}年 ${month + 1}月`;
        const firstDayOfMonth = new Date(year, month, 1);
        const lastDayOfMonth = new Date(year, month + 1, 0);
        const daysInMonth = lastDayOfMonth.getDate();
        const startDayOfWeek = firstDayOfMonth.getDay();
        const todayString = getTodayDateString();
        const prevMonthLastDate = new Date(year, month, 0).getDate();
        for (let i = startDayOfWeek - 1; i >= 0; i--) {
            const dayCell = document.createElement('div');
            dayCell.classList.add('calendar-day', 'other-month');
            dayCell.innerHTML = `<span class="day-number">${prevMonthLastDate - i}</span>`;
            calendarGrid.appendChild(dayCell);
        }
        for (let day = 1; day <= daysInMonth; day++) {
            const dayCell = document.createElement('div');
            dayCell.classList.add('calendar-day');
            const dayNumberSpan = document.createElement('span');
            dayNumberSpan.className = 'day-number';
            dayNumberSpan.textContent = day;
            dayCell.appendChild(dayNumberSpan);
            const cellDateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            if (cellDateString === todayString) dayCell.classList.add('today');
            if (cellDateString === selectedDateString) dayCell.classList.add('selected-date');
            const tasksOnThisDay = tasks.filter(task => task.dueDate === cellDateString && !task.completed);
            if (tasksOnThisDay.length > 0) {
                const tasksContainer = document.createElement('div');
                tasksContainer.className = 'calendar-day-tasks';
                tasksOnThisDay.slice(0, 3).forEach(task => {
                    const taskElement = document.createElement('div');
                    taskElement.className = 'calendar-task';
                    const categoryColors = getCategoryColor(task.category);
                    taskElement.style.backgroundColor = categoryColors.background;
                    taskElement.style.color = categoryColors.text;
                    taskElement.textContent = task.name;
                    taskElement.title = task.name;
                    tasksContainer.appendChild(taskElement);
                });
                if (tasksOnThisDay.length > 3) {
                     const moreTasksElement = document.createElement('div');
                     moreTasksElement.className = 'calendar-task-more';
                     moreTasksElement.textContent = `他 ${tasksOnThisDay.length - 3}件...`;
                     tasksContainer.appendChild(moreTasksElement);
                }
                dayCell.appendChild(tasksContainer);
            }
            dayCell.addEventListener('click', () => {
                document.querySelectorAll('.calendar-day.selected-date').forEach(el => el.classList.remove('selected-date'));
                dayCell.classList.add('selected-date');
                selectedDateString = cellDateString;
                currentView = 'active';
                renderTasks();
            });
            calendarGrid.appendChild(dayCell);
        }
        const totalCells = calendarGrid.children.length > 35 ? 42 : 35;
        for (let i = 1; calendarGrid.children.length < totalCells; i++) {
            const dayCell = document.createElement('div');
            dayCell.classList.add('calendar-day', 'other-month');
            dayCell.innerHTML = `<span class="day-number">${i}</span>`;
            calendarGrid.appendChild(dayCell);
        }
    }

    // --- Task List Rendering ---
    function renderTasks() {
        if (!dailyTasksArea) return;
        const todayString = getTodayDateString();
        let tasksToDisplay = [];
        const listTitleElement = dailyTasksArea.querySelector('h2');
        if (selectedDateString) {
            tasksToDisplay = tasks.filter(task => task.dueDate === selectedDateString && !task.completed);
            if (listTitleElement) listTitleElement.textContent = `${selectedDateString} のタスク`;
            if (toggleViewBtn) toggleViewBtn.style.display = 'none';
        } else if (currentView === 'active') {
            tasksToDisplay = tasks.filter(task => !task.completed || (task.completionDate && task.completionDate.startsWith(todayString)));
            if (listTitleElement) listTitleElement.textContent = '今日のタスク / アクティブなタスク';
            if (toggleViewBtn) {
                toggleViewBtn.textContent = '完了済みタスクを見る';
                toggleViewBtn.style.display = 'inline-block';
            }
        } else { 
            tasksToDisplay = tasks.filter(task => task.completed && task.completionDate && !task.completionDate.startsWith(todayString));
            if (listTitleElement) listTitleElement.textContent = '完了済みタスク (アーカイブ)';
            if (toggleViewBtn) {
                 toggleViewBtn.textContent = 'アクティブなタスクを見る';
                 toggleViewBtn.style.display = 'inline-block';
            }
        }
        tasksToDisplay.sort((a, b) => {
            if (selectedDateString || currentView === 'active') {
                if (a.completed !== b.completed) return a.completed ? 1 : -1;
                if (b.priority !== a.priority) return b.priority - a.priority;
                if (a.dueDate && b.dueDate) return new Date(a.dueDate) - new Date(b.dueDate);
                else if (a.dueDate) return -1;
                else if (b.dueDate) return 1;
                return a.id - b.id;
            } else {
                if (a.completionDate && b.completionDate) return new Date(b.completionDate) - new Date(a.completionDate);
                return b.id - a.id;
            }
        });
        let taskListContainer = dailyTasksArea.querySelector('ul');
        if (!taskListContainer) {
            taskListContainer = document.createElement('ul');
            const placeholder = dailyTasksArea.querySelector('p');
            if (placeholder) placeholder.remove();
            dailyTasksArea.appendChild(taskListContainer);
        }
        taskListContainer.innerHTML = '';
        if (tasksToDisplay.length === 0) {
            const noTasksMessage = document.createElement('li');
            if (selectedDateString) {
                noTasksMessage.textContent = 'この日のタスクはありません。';
            } else {
                noTasksMessage.textContent = currentView === 'active' ? 'アクティブなタスクはありません。' : '完了済みの古いタスクはありません。';
            }
            taskListContainer.appendChild(noTasksMessage);
            return;
        }

        tasksToDisplay.forEach(function(task) {
            const listItem = document.createElement('li');
            listItem.setAttribute('data-task-id', task.id);
            listItem.className = 'task-item';
            if (task.completed) {
                listItem.classList.add('completed');
            }

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'task-checkbox';
            checkbox.checked = task.completed;
            checkbox.addEventListener('change', () => toggleComplete(task.id));
            listItem.appendChild(checkbox);

            const detailsDiv = document.createElement('div');
            detailsDiv.className = 'task-details';

            const taskNameSpan = document.createElement('span');
            taskNameSpan.className = 'task-name';
            taskNameSpan.textContent = task.name;
            detailsDiv.appendChild(taskNameSpan);

            if (task.dueDate) {
                const dueDateSpan = document.createElement('span');
                dueDateSpan.className = 'task-due-date';
                dueDateSpan.textContent = ` (期限: ${task.dueDate})`;
                detailsDiv.appendChild(dueDateSpan);
            }
            
            let shouldShowPriorityCategory = false;
            if (selectedDateString && !task.completed) {
                shouldShowPriorityCategory = true;
            } else if (!selectedDateString && currentView === 'active') {
                 shouldShowPriorityCategory = true;
            }

            if (shouldShowPriorityCategory) {
                const prioritySpan = document.createElement('span');
                prioritySpan.className = 'task-priority';
                prioritySpan.innerHTML = ` 優先度: ${'★'.repeat(task.priority)}${'☆'.repeat(5 - task.priority)}`;
                detailsDiv.appendChild(prioritySpan);

                const categorySpan = document.createElement('span');
                categorySpan.className = 'task-category-tag';
                const categoryColors = getCategoryColor(task.category);
                categorySpan.style.backgroundColor = categoryColors.background;
                categorySpan.style.color = categoryColors.text;
                categorySpan.style.padding = '2px 6px';
                categorySpan.style.borderRadius = '4px';
                categorySpan.style.fontSize = '0.8em';
                categorySpan.style.marginLeft = '5px';
                categorySpan.textContent = task.category;
                detailsDiv.appendChild(categorySpan);
            }
            
            if (task.completionDate) {
                const completionDateSpan = document.createElement('span');
                completionDateSpan.className = 'task-completion-date';
                const cDate = new Date(task.completionDate);
                completionDateSpan.textContent = ` (完了日: ${cDate.toLocaleDateString()})`;
                detailsDiv.appendChild(completionDateSpan);
            }

            if (task.memo && task.memo.trim() !== '') {
                const memoP = document.createElement('p');
                memoP.className = 'task-memo';
                memoP.textContent = `メモ: ${task.memo}`;
                detailsDiv.appendChild(memoP);
            }

            listItem.appendChild(detailsDiv);

            let showActions = false;
            if (selectedDateString && !task.completed) {
                showActions = true;
            } else if (!selectedDateString && (!task.completed || (task.completed && task.completionDate && task.completionDate.startsWith(todayString)))) {
                 showActions = true;
            }

            if (showActions) {
                const actionsDiv = document.createElement('div');
                actionsDiv.className = 'task-actions';

                if (!task.completed) {
                    const editButton = document.createElement('button');
                    editButton.innerHTML = '<i class="fa-solid fa-pencil"></i>';
                    editButton.title = '編集';
                    editButton.className = 'edit-btn';
                    editButton.addEventListener('click', () => openEditModal(task.id));
                    actionsDiv.appendChild(editButton);
                }

                const deleteButton = document.createElement('button');
                deleteButton.innerHTML = '<i class="fa-solid fa-trash"></i>';
                deleteButton.title = '削除';
                deleteButton.className = 'delete-btn';
                deleteButton.addEventListener('click', () => deleteTask(task.id));
                actionsDiv.appendChild(deleteButton);

                listItem.appendChild(actionsDiv);
            }
            taskListContainer.appendChild(listItem);
        });
    }
    
    // --- Task Action Functions ---
    function toggleComplete(taskId) {
        const task = tasks.find(t => t.id === taskId);
        if (task) {
            task.completed = !task.completed;
            if (task.completed) {
                task.completionDate = getTodayDateString() + "T" + new Date().toTimeString().split(' ')[0];
            } else {
                task.completionDate = null;
            }
            saveTasks();
            renderCalendar();
            renderTasks();
        }
    }
    function deleteTask(taskId) {
        if (confirm('本当にこのタスクを削除しますか？')) {
            tasks = tasks.filter(t => t.id !== taskId);
            saveTasks();
            renderCalendar();
            renderTasks();
        }
    }
    function openEditModal(taskId) {
        const taskToEdit = tasks.find(t => t.id === taskId);
        if (!taskToEdit) return;
        if (taskInputModal) {
            editingTaskId = taskId;
            if (modalTitle) modalTitle.textContent = 'タスクを編集';
            document.getElementById('task-name').value = taskToEdit.name;
            document.getElementById('task-due-date').value = taskToEdit.dueDate;
            document.getElementById('task-priority').value = taskToEdit.priority;
            populateCategorySelect(taskToEdit.category);
            document.getElementById('task-memo').value = taskToEdit.memo;
            taskInputModal.classList.add('is-visible');
        }
    }
    
    // --- Calendar Navigation Event Listeners ---
    if (prevMonthBtn) {
        prevMonthBtn.addEventListener('click', () => {
            console.log("Prev month button clicked");
            currentDate.setMonth(currentDate.getMonth() - 1);
            selectedDateString = null;
            renderCalendar();
            renderTasks();
        });
    }
    if (nextMonthBtn) {
        nextMonthBtn.addEventListener('click', () => {
            console.log("Next month button clicked");
            currentDate.setMonth(currentDate.getMonth() + 1);
            selectedDateString = null;
            renderCalendar();
            renderTasks();
        });
    }
    
    // --- Toggle View (Active/Archived) Event Listener ---
    if (toggleViewBtn) {
        toggleViewBtn.addEventListener('click', function() {
            selectedDateString = null;
            currentView = (currentView === 'active') ? 'archived' : 'active';
            renderCalendar();
            renderTasks();
        });
    }

    // --- Initial Application Load ---
    console.log("Initializing app...");
    loadCategories();
    loadTasks();
    renderCalendar();
    renderTasks();
});