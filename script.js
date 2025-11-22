// ОБЪЯВЛЯЕМ ВСЕ ФУНКЦИИ ГЛОБАЛЬНО ДО ЗАГРУЗКИ DOM

// Хранилище данных
var teachers = {};
var groups = {};
var currentTeacher = '';
var currentStudent = '';
var currentGroupCode = '';

// Базовые функции навигации
function showMainScreen() {
    hideAllScreens();
    document.getElementById('mainScreen').classList.add('active');
}

function showTeacherLogin() {
    hideAllScreens();
    document.getElementById('teacherLogin').classList.add('active');
}

function showStudentLogin() {
    hideAllScreens();
    document.getElementById('studentLogin').classList.add('active');
}

function hideAllScreens() {
    var screens = document.querySelectorAll('.screen');
    screens.forEach(function(screen) {
        screen.classList.remove('active');
    });
}

// Функции учителя
function loginTeacher() {
    var teacherName = document.getElementById('teacherName').value.trim();
    
    if (!teacherName) {
        alert('Введите ваше имя!');
        return;
    }

    currentTeacher = teacherName;
    
    // Сохраняем учителя если его нет
    if (!teachers[teacherName]) {
        teachers[teacherName] = {
            groups: []
        };
        saveTeachers();
    }

    hideAllScreens();
    document.getElementById('teacherPanel').classList.add('active');
    document.getElementById('teacherUserName').textContent = teacherName;
    loadGroupsList();
}

function createGroup() {
    var groupName = document.getElementById('groupName').value.trim();
    
    if (!groupName) {
        alert('Введите название группы!');
        return;
    }

    // Генерация кода
    var groupCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    // Создание группы
    groups[groupCode] = {
        name: groupName,
        teacher: currentTeacher,
        students: {},
        createdAt: new Date().toLocaleDateString()
    };

    // Добавляем группу учителю
    teachers[currentTeacher].groups.push(groupCode);

    saveGroups();
    saveTeachers();

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

function loadGroupsList() {
    var groupsList = document.getElementById('groupsList');
    var teacherGroups = teachers[currentTeacher].groups || [];

    if (teacherGroups.length === 0) {
        groupsList.innerHTML = '<p>У вас пока нет групп</p>';
        return;
    }

    groupsList.innerHTML = '';
    teacherGroups.forEach(function(groupCode) {
        var group = groups[groupCode];
        if (!group) return;

        var studentCount = Object.keys(group.students).length;
        var groupElement = document.createElement('div');
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

function viewGroup(groupCode) {
    currentGroupCode = groupCode;
    var group = groups[groupCode];
    
    hideAllScreens();
    document.getElementById('groupView').classList.add('active');
    document.getElementById('groupViewTitle').textContent = group.name;
    
    var studentsContainer = document.getElementById('studentsInGroup');
    studentsContainer.innerHTML = '';

    var students = Object.entries(group.students);
    if (students.length === 0) {
        studentsContainer.innerHTML = '<p>В группе пока нет учеников</p>';
        return;
    }

    students.forEach(function([studentName, studentData]) {
        var studentElement = document.createElement('div');
        studentElement.className = 'student-item';
        
        var gradesHtml = '';
        if (studentData.grades && studentData.grades.length > 0) {
            gradesHtml = studentData.grades.map(function(grade) {
                return `<span class="grade-item">${grade}</span>`;
            }).join('');
        } else {
            gradesHtml = '<p>Оценок нет</p>';
        }
        
        studentElement.innerHTML = `
            <h4>${studentName}</h4>
            <div>Оценки: ${gradesHtml}</div>
            <div style="margin-top: 10px;">
                <input type="number" id="grade-${studentName}" class="grade-input" min="1" max="5" placeholder="5">
                <button onclick="addGrade('${studentName}')">Добавить</button>
            </div>
        `;
        studentsContainer.appendChild(studentElement);
    });
}

function addGrade(studentName) {
    var gradeInput = document.getElementById('grade-' + studentName);
    var grade = parseInt(gradeInput.value);
    
    if (grade >= 1 && grade <= 5) {
        if (!groups[currentGroupCode].students[studentName].grades) {
            groups[currentGroupCode].students[studentName].grades = [];
        }
        groups[currentGroupCode].students[studentName].grades.push(grade);
        saveGroups();
        viewGroup(currentGroupCode); // Обновляем вид
    } else {
        alert('Введите оценку от 1 до 5!');
    }
    gradeInput.value = '';
}

function deleteGroup(groupCode) {
    if (confirm('Удалить эту группу?')) {
        // Удаляем группу у учителя
        teachers[currentTeacher].groups = teachers[currentTeacher].groups.filter(function(code) {
            return code !== groupCode;
        });
        // Удаляем саму группу
        delete groups[groupCode];
        
        saveGroups();
        saveTeachers();
        loadGroupsList();
    }
}

function backToTeacherPanel() {
    hideAllScreens();
    document.getElementById('teacherPanel').classList.add('active');
}

// Функции ученика
function joinGroup() {
    var studentName = document.getElementById('studentName').value.trim();
    var groupCode = document.getElementById('groupCodeInput').value.toUpperCase();
    
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
            grades: []
        };
        saveGroups();
    }
    
    currentStudent = studentName;
    currentGroupCode = groupCode;
    
    // Показываем панель ученика
    hideAllScreens();
    document.getElementById('studentPanel').classList.add('active');
    loadStudentInfo();
}

function loadStudentInfo() {
    var studentInfo = document.getElementById('studentInfo');
    var gradesList = document.getElementById('gradesList');
    var studentData = groups[currentGroupCode].students[currentStudent];
    
    studentInfo.innerHTML = `
        <div class="student-item">
            <h3>${currentStudent}</h3>
            <p>Группа: ${groups[currentGroupCode].name}</p>
        </div>
    `;
    
    if (studentData.grades && studentData.grades.length > 0) {
        var averageGrade = (studentData.grades.reduce(function(a, b) { return a + b; }, 0) / studentData.grades.length).toFixed(2);
        gradesList.innerHTML = `
            <div class="section">
                <h3>Мои оценки</h3>
                <p>Средний балл: <strong>${averageGrade}</strong></p>
                <div>${studentData.grades.map(function(grade) {
                    return `<span class="grade-item">${grade}</span>`;
                }).join('')}</div>
            </div>
        `;
    } else {
        gradesList.innerHTML = '<div class="section"><p>Оценок пока нет</p></div>';
    }
}

// Выход
function logout() {
    currentTeacher = '';
    currentStudent = '';
    currentGroupCode = '';
    showMainScreen();
}

//Сохранение данных
function saveTeachers() {
    localStorage.setItem('mathTeachers', JSON.stringify(teachers));
}

function saveGroups() {
    localStorage.setItem('mathGroups', JSON.stringify(groups));
}

// Загрузка данных при старте
function loadData() {
    var savedTeachers = localStorage.getItem('mathTeachers');
    var savedGroups = localStorage.getItem('mathGroups');
    
    if (savedTeachers) {
        teachers = JSON.parse(savedTeachers);
    }
    if (savedGroups) {
        groups = JSON.parse(savedGroups);
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    loadData();
});
