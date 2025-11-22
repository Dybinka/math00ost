// Хранилище данных
let teachers = JSON.parse(localStorage.getItem('mathTeachers')) || {};
let groups = JSON.parse(localStorage.getItem('mathGroups')) || {};
let currentTeacher = '';
let currentStudent = '';
let currentGroupCode = '';

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
            groups: []
        };
        saveTeachers();
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

// Загрузить список групп
function loadGroupsList() {
    const groupsList = document.getElementById('groupsList');
    const teacherGroups = teachers[currentTeacher].groups || [];

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
                `<span class="grade-with-topic">
                    ${grade.value}
                    <span class="topic-badge">${grade.topic || 'Без темы'}</span>
                </span>`
            ).join('');
        } else {
            gradesHtml = '<p>Оценок нет</p>';
        }
        
        studentElement.innerHTML = `
            <h4>${studentName}</h4>
            <div>Оценки: ${gradesHtml}</div>
            <div class="grade-inputs">
                <input type="number" id="grade-${studentName}" class="grade-input" min="1" max="5" placeholder="5">
                <input type="text" id="topic-${studentName}" class="topic-input" placeholder="Тема (например: Дроби)">
                <button class="add-grade-btn" onclick="addGrade('${studentName}')">Добавить</button>
            </div>
        `;
        studentsContainer.appendChild(studentElement);
    });
}

// Добавить оценку
function addGrade(studentName) {
    const gradeInput = document.getElementById(`grade-${studentName}`);
    const topicInput = document.getElementById(`topic-${studentName}`);
    const grade = parseInt(gradeInput.value);
    const topic = topicInput.value.trim() || 'Без темы';
    
    if (grade >= 1 && grade <= 5) {
        if (!groups[currentGroupCode].students[studentName].grades) {
            groups[currentGroupCode].students[studentName].grades = [];
        }
        
        // Добавляем оценку с темой
        groups[currentGroupCode].students[studentName].grades.push({
            value: grade,
            topic: topic,
            date: new Date().toLocaleDateString()
        });
        
        saveGroups();
        viewGroup(currentGroupCode); // Обновляем вид
    } else {
        alert('Введите оценку от 1 до 5!');
    }
    gradeInput.value = '';
    topicInput.value = '';
}

// Удалить группу
function deleteGroup(groupCode) {
    if (confirm('Удалить эту группу?')) {
        // Удаляем группу у учителя
        teachers[currentTeacher].groups = teachers[currentTeacher].groups.filter(code => code !== groupCode);
        // Удаляем саму группу
        delete groups[groupCode];
        
        saveGroups();
        saveTeachers();
        loadGroupsList();
    }
}

// Назад к панели учителя
function backToTeacherPanel() {
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

// Загрузить информацию ученика
function loadStudentInfo() {
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
        // Считаем средний балл
        const totalGrade = studentData.grades.reduce((sum, grade) => sum + grade.value, 0);
        const averageGrade = (totalGrade / studentData.grades.length).toFixed(2);
        
        // Создаем список оценок с темами
        let gradesHtml = '';
        studentData.grades.forEach(grade => {
            gradesHtml += `
                <div class="grade-details">
                    <span class="grade-with-topic">
                        ${grade.value}
                        <span class="topic-badge">${grade.topic}</span>
                    </span>
                    <small style="color: #666; margin-left: 10px;">${grade.date}</small>
                </div>
            `;
        });
        
        gradesList.innerHTML = `
            <div class="section">
                <h3>Мои оценки</h3>
                <p>Средний балл: <strong>${averageGrade}</strong></p>
                <div>${gradesHtml}</div>
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

// Сохранить данные
function saveTeachers() {
    localStorage.setItem('mathTeachers', JSON.stringify(teachers));
}

function saveGroups() {
    localStorage.setItem('mathGroups', JSON.stringify(groups));
}

// Скрыть все экраны
function hideAllScreens() {
    const screens = document.querySelectorAll('.screen');
    screens.forEach(screen => screen.classList.remove('active'));
}

// Запуск
showMainScreen();
