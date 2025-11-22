// Хранилище данных
let teachers = {};
let groups = {};
let currentTeacher = '';
let currentStudent = '';
let currentGroupCode = '';

// Система сохранения данных
const StorageManager = {
    // Ключи для LocalStorage
    keys: {
        TEACHERS: 'mathTeachers',
        GROUPS: 'mathGroups'
    },

    // Безопасное сохранение данных
    setItem(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            console.log('Данные сохранены:', key);
            return true;
        } catch (error) {
            console.error('Ошибка сохранения:', error);
            // Попытка очистки старых данных при переполнении
            if (error.name === 'QuotaExceededError') {
                this.clearOldData();
                try {
                    localStorage.setItem(key, JSON.stringify(value));
                    return true;
                } catch (e) {
                    console.error('Не удалось сохранить после очистки:', e);
                    alert('Недостаточно места для сохранения данных. Очистите кэш браузера.');
                }
            }
            return false;
        }
    },

    // Безопасная загрузка данных
    getItem(key) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : null;
        } catch (error) {
            console.error('Ошибка загрузки:', error);
            return null;
        }
    },

    // Очистка старых данных (резервный метод)
    clearOldData() {
        const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('temp_')) {
                localStorage.removeItem(key);
            }
        }
    },

    // Проверка поддержки LocalStorage
    isSupported() {
        try {
            const test = 'test';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (e) {
            return false;
        }
    }
};

// Инициализация данных при загрузке страницы
function initializeData() {
    if (!StorageManager.isSupported()) {
        alert('Ваш браузер не поддерживает сохранение данных. Некоторые функции могут быть недоступны.');
        return;
    }

    // Загружаем данные
    teachers = StorageManager.getItem(StorageManager.keys.TEACHERS) || {};
    groups = StorageManager.getItem(StorageManager.keys.GROUPS) || {};

    console.log('Данные загружены:', { teachers, groups });
}

// Автосохранение при любых изменениях
function autoSave() {
    saveTeachers();
    saveGroups();
}

// Улучшенное сохранение учителей
function saveTeachers() {
    const success = StorageManager.setItem(StorageManager.keys.TEACHERS, teachers);
    if (!success) {
        console.warn('Не удалось сохранить данные учителей');
    }
    return success;
}

// Улучшенное сохранение групп
function saveGroups() {
    const success = StorageManager.setItem(StorageManager.keys.GROUPS, groups);
    if (!success) {
        console.warn('Не удалось сохранить данные групп');
    }
    return success;
}

// Сохранение при закрытии страницы
window.addEventListener('beforeunload', function() {
    autoSave();
});

// Сохранение при изменении видимости страницы
document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        autoSave();
    }
});

// Сохранение при выходе из приложения
function logout() {
    autoSave(); // Сохраняем перед выходом
    currentTeacher = '';
    currentStudent = '';
    currentGroupCode = '';
    showMainScreen();
}

// Показать главный экран
function showMainScreen() {
    hideAllScreens();
    document.getElementById('mainScreen').classList.add('active');
}

// Показать вход для учителя
function showTeacherLogin() {
    hideAllScreens();
    document.getElementById('teacherLogin').classList.add('active');
}

// Показать вход для ученика
function showStudentLogin() {
    hideAllScreens();
    document.getElementById('studentLogin').classList.add('active');
}

// Вход учителя
function loginTeacher() {
    const teacherName = document.getElementById('teacherName').value.trim();
    
    if (!teacherName) {
        alert('Введите ваше имя!');
        return;
    }

    currentTeacher = teacherName;
    
    // Сохраняем учителя если его нет
    if (!teachers[teacherName]) {
        teachers[teacherName] = {
            groups: [],
            createdAt: new Date().toISOString()
        };
        autoSave(); // Сохраняем изменения
    }

    hideAllScreens();
    document.getElementById('teacherPanel').classList.add('active');
    document.getElementById('teacherUserName').textContent = teacherName;
    loadGroupsList();
}

// Создать группу
function createGroup() {
    const groupName = document.getElementById('groupName').value.trim();
    
    if (!groupName) {
        alert('Введите название группы!');
        return;
    }

    // Генерация кода
    const groupCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    // Создание группы
    groups[groupCode] = {
        name: groupName,
        teacher: currentTeacher,
        students: {},
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString()
    };

    // Добавляем группу учителю
    teachers[currentTeacher].groups.push(groupCode);

    autoSave(); // Сохраняем изменения

    // Показываем код
    document.getElementById('groupCodeDisplay').innerHTML = `
        <div class="code-display">
            Код группы: ${groupCode}
        </div>
        <p>Дайте этот код ученикам</p>
    `;

    document.getElementById('groupName').value = '';
    loadGroupsList();
}

// Загрузить список групп
function loadGroupsList() {
    const groupsList = document.getElementById('groupsList');
    const teacherGroups = teachers[currentTeacher]?.groups || [];

    if (teacherGroups.length === 0) {
        groupsList.innerHTML = '<p>У вас пока нет групп</p>';
        return;
    }

    groupsList.innerHTML = '';
    teacherGroups.forEach(groupCode => {
        const group = groups[groupCode];
        if (!group) return;

        const studentCount = Object.keys(group.students).length;
        const groupElement = document.createElement('div');
        groupElement.className = 'group-item';
        groupElement.innerHTML = `
            <h4>${group.name}</h4>
            <p>Код: ${groupCode} | Учеников: ${studentCount}</p>
            <p><small>Создана: ${new Date(group.createdAt).toLocaleDateString()}</small></p>
            <button onclick="viewGroup('${groupCode}')">Открыть</button>
            <button onclick="deleteGroup('${groupCode}')" style="background: #f44336;">Удалить</button>
        `;
        groupsList.appendChild(groupElement);
    });
}

// Просмотр группы
function viewGroup(groupCode) {
    currentGroupCode = groupCode;
    const group = groups[groupCode];
    
    hideAllScreens();
    document.getElementById('groupView').classList.add('active');
    document.getElementById('groupViewTitle').textContent = group.name;
    
    const studentsContainer = document.getElementById('studentsInGroup');
    studentsContainer.innerHTML = '';

    const students = Object.entries(group.students);
    if (students.length === 0) {
        studentsContainer.innerHTML = '<p>В группе пока нет учеников</p>';
        return;
    }

    students.forEach(([studentName, studentData]) => {
        const studentElement = document.createElement('div');
        studentElement.className = 'student-item';
        
        let gradesHtml = '';
        if (studentData.grades && studentData.grades.length > 0) {
            gradesHtml = studentData.grades.map(grade => 
                `<span class="grade-item">${grade}</span>`
            ).join('');
        } else {
            gradesHtml = '<p>Оценок нет</p>';
        }
        
        studentElement.innerHTML = `
            <h4>${studentName}</h4>
            <div>Оценки: ${gradesHtml}</div>
            <div style="margin-top: 10px;">
                <input type="number" id="grade-${studentName}" class="grade-input" min="1" max="5" placeholder="5">
                <button class="add-grade-btn" onclick="addGrade('${studentName}')">Добавить</button>
            </div>
        `;
        studentsContainer.appendChild(studentElement);
    });
}

// Добавить оценку
function addGrade(studentName) {
    const gradeInput = document.getElementById(`grade-${studentName}`);
    const grade = parseInt(gradeInput.value);
    
    if (grade >= 1 && grade <= 5) {
        if (!groups[currentGroupCode].students[studentName].grades) {
            groups[currentGroupCode].students[studentName].grades = [];
        }
        groups[currentGroupCode].students[studentName].grades.push(grade);
        groups[currentGroupCode].lastModified = new Date().toISOString(); // Обновляем время изменения
        
        autoSave(); // Сохраняем изменения
        viewGroup(currentGroupCode); // Обновляем вид
    } else {
        alert('Введите оценку от 1 до 5!');
    }
    gradeInput.value = '';
}

// Удалить группу
function deleteGroup(groupCode) {
    if (confirm('Удалить эту группу?')) {
        // Удаляем группу у учителя
        teachers[currentTeacher].groups = teachers[currentTeacher].groups.filter(code => code !== groupCode);
        // Удаляем саму группу
        delete groups[groupCode];
        
        autoSave(); // Сохраняем изменения
        loadGroupsList();
    }
}

// Назад к панели учителя
function backToTeacherPanel() {
    autoSave(); // Сохраняем перед переходом
    hideAllScreens();
    document.getElementById('teacherPanel').classList.add('active');
}

// Вход ученика в группу
function joinGroup() {
    const studentName = document.getElementById('studentName').value.trim();
    const groupCode = document.getElementById('groupCodeInput').value.toUpperCase();
    
    if (!studentName || !groupCode) {
        alert('Заполните все поля!');
        return;
    }
    
    if (!groups[groupCode]) {
        alert('Группа не найдена!');
        return;
    }
    
    // Регистрируем ученика в группе
    if (!groups[groupCode].students[studentName]) {
        groups[groupCode].students[studentName] = {
            grades: [],
            joinedAt: new Date().toISOString()
        };
        groups[groupCode].lastModified = new Date().toISOString();
        autoSave(); // Сохраняем изменения
    }
    
    currentStudent = studentName;
    currentGroupCode = groupCode;
    
    // Показываем панель ученика
    hideAllScreens();
    document.getElementById('studentPanel').classList.add('active');
    loadStudentInfo();
}

// Загрузить информацию ученика
function loadStudentInfo() {
    const studentInfo = document.getElementById('studentInfo');
    const gradesList = document.getElementById('gradesList');
    const studentData = groups[currentGroupCode].students[currentStudent];
    
    studentInfo.innerHTML = `
        <div class="student-item">
            <h3>${currentStudent}</h3>
            <p>Группа: ${groups[currentGroupCode].name}</p>
            <p><small>Присоединился: ${new Date(studentData.joinedAt).toLocaleDateString()}</small></p>
        </div>
    `;
    
    if (studentData.grades && studentData.grades.length > 0) {
        const averageGrade = (studentData.grades.reduce((a, b) => a + b, 0) / studentData.grades.length).toFixed(2);
        gradesList.innerHTML = `
            <div class="section">
                <h3>Мои оценки</h3>
                <p>Средний балл: <strong>${averageGrade}</strong></p>
                <p>Всего оценок: <strong>${studentData.grades.length}</strong></p>
                <div>${studentData.grades.map(grade => `<span class="grade-item">${grade}</span>`).join('')}</div>
            </div>
        `;
    } else {
        gradesList.innerHTML = '<div class="section"><p>Оценок пока нет</p></div>';
    }
}

// Скрыть все экраны
function hideAllScreens() {
    const screens = document.querySelectorAll('.screen');
    screens.forEach(screen => screen.classList.remove('active'));
}

// Инициализируем данные при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    initializeData();
    
    // Периодическое автосохранение (каждые 30 секунд)
    setInterval(autoSave, 30000);
    
    // Сохранение при изменении данных в полях ввода
    document.querySelectorAll('input').forEach(input => {
        input.addEventListener('change', autoSave);
    });
});
}

// Запуск

showMainScreen();
