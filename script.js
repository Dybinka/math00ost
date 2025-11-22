// Хранилище данных
let teachers = {};
let groups = {};
let currentTeacher = '';
let currentStudent = '';
let currentGroupCode = '';

// Система сохранения данных
const StorageManager = {
    keys: {
        TEACHERS: 'mathTeachers',
        GROUPS: 'mathGroups'
    },

    setItem(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error('Ошибка сохранения:', error);
            return false;
        }
    },

    getItem(key) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : null;
        } catch (error) {
            console.error('Ошибка загрузки:', error);
            return null;
        }
    }
};

// Инициализация данных при загрузке страницы
function initializeData() {
    teachers = StorageManager.getItem(StorageManager.keys.TEACHERS) || {};
    groups = StorageManager.getItem(StorageManager.keys.GROUPS) || {};
}

// Автосохранение
function autoSave() {
    saveTeachers();
    saveGroups();
}

function saveTeachers() {
    StorageManager.setItem(StorageManager.keys.TEACHERS, teachers);
}

function saveGroups() {
    StorageManager.setItem(StorageManager.keys.GROUPS, groups);
}

// ГЛОБАЛЬНЫЕ ФУНКЦИИ ДЛЯ КНОПОК
window.showMainScreen = function() {
    hideAllScreens();
    document.getElementById('mainScreen').classList.add('active');
}

window.showTeacherLogin = function() {
    hideAllScreens();
    document.getElementById('teacherLogin').classList.add('active');
}

window.showStudentLogin = function() {
    hideAllScreens();
    document.getElementById('studentLogin').classList.add('active');
}

window.loginTeacher = function() {
    const teacherName = document.getElementById('teacherName').value.trim();
    
    if (!teacherName) {
        alert('Введите ваше имя!');
        return;
    }

    currentTeacher = teacherName;
    
    if (!teachers[teacherName]) {
        teachers[teacherName] = {
            groups: [],
            createdAt: new Date().toISOString()
        };
        autoSave();
    }

    hideAllScreens();
    document.getElementById('teacherPanel').classList.add('active');
    document.getElementById('teacherUserName').textContent = teacherName;
    loadGroupsList();
}

window.createGroup = function() {
    const groupName = document.getElementById('groupName').value.trim();
    
    if (!groupName) {
        alert('Введите название группы!');
        return;
    }

    const groupCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    groups[groupCode] = {
        name: groupName,
        teacher: currentTeacher,
        students: {},
        createdAt: new Date().toISOString()
    };

    teachers[currentTeacher].groups.push(groupCode);
    autoSave();

    document.getElementById('groupCodeDisplay').innerHTML = `
        <div class="code-display">
            Код группы: <strong>${groupCode}</strong>
        </div>
        <p>Дайте этот код ученикам</p>
    `;

    document.getElementById('groupName').value = '';
    loadGroupsList();
}

window.loadGroupsList = function() {
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
            <button onclick="viewGroup('${groupCode}')">Открыть</button>
            <button onclick="deleteGroup('${groupCode}')" style="background: #f44336;">Удалить</button>
        `;
        groupsList.appendChild(groupElement);
    });
}

window.viewGroup = function(groupCode) {
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
                <button onclick="addGrade('${studentName}')">Добавить оценку</button>
            </div>
        `;
        studentsContainer.appendChild(studentElement);
    });
}

window.addGrade = function(studentName) {
    const gradeInput = document.getElementById(`grade-${studentName}`);
    const grade = parseInt(gradeInput.value);
    
    if (grade >= 1 && grade <= 5) {
        if (!groups[currentGroupCode].students[studentName].grades) {
            groups[currentGroupCode].students[studentName].grades = [];
        }
        groups[currentGroupCode].students[studentName].grades.push(grade);
        autoSave();
        viewGroup(currentGroupCode);
    } else {
        alert('Введите оценку от 1 до 5!');
    }
    gradeInput.value = '';
}

window.deleteGroup = function(groupCode) {
    if (confirm('Удалить эту группу?')) {
        teachers[currentTeacher].groups = teachers[currentTeacher].groups.filter(code => code !== groupCode);
        delete groups[groupCode];
        autoSave();
        loadGroupsList();
    }
}

window.backToTeacherPanel = function() {
    hideAllScreens();
    document.getElementById('teacherPanel').classList.add('active');
}

window.joinGroup = function() {
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
    
    if (!groups[groupCode].students[studentName]) {
        groups[groupCode].students[studentName] = {
            grades: [],
            joinedAt: new Date().toISOString()
        };
        autoSave();
    }
    
    currentStudent = studentName;
    currentGroupCode = groupCode;
    
    hideAllScreens();
    document.getElementById('studentPanel').classList.add('active');
    loadStudentInfo();
}

window.loadStudentInfo = function() {
    const studentInfo = document.getElementById('studentInfo');
    const gradesList = document.getElementById('gradesList');
    const studentData = groups[currentGroupCode].students[currentStudent];
    
    studentInfo.innerHTML = `
        <div class="student-item">
            <h3>${currentStudent}</h3>
            <p>Группа: ${groups[currentGroupCode].name}</p>
        </div>
    `;
    
    if (studentData.grades && studentData.grades.length > 0) {
        const averageGrade = (studentData.grades.reduce((a, b) => a + b, 0) / studentData.grades.length).toFixed(2);
        gradesList.innerHTML = `
            <div class="section">
                <h3>Мои оценки</h3>
                <p>Средний балл: <strong>${averageGrade}</strong></p>
                <div>${studentData.grades.map(grade => `<span class="grade-item">${grade}</span>`).join('')}</div>
            </div>
        `;
    } else {
        gradesList.innerHTML = '<div class="section"><p>Оценок пока нет</p></div>';
    }
}

window.logout = function() {
    currentTeacher = '';
    currentStudent = '';
    currentGroupCode = '';
    showMainScreen();
}

window.hideAllScreens = function() {
    const screens = document.querySelectorAll('.screen');
    screens.forEach(screen => screen.classList.remove('active'));
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    initializeData();
    
    // Автосохранение каждые 30 секунд
    setInterval(autoSave, 30000);
    
    // Сохранение при закрытии страницы
    window.addEventListener('beforeunload', autoSave);
});
