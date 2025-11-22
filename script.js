// Конфигурация Firebase
const firebaseConfig = {
    apiKey: "your-api-key",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "123456789",
    appId: "your-app-id"
};

// Инициализация Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Хранилище данных (кеш для оффлайн работы)
let teachers = JSON.parse(localStorage.getItem('mathTeachers')) || {};
let groups = JSON.parse(localStorage.getItem('mathGroups')) || {};
let currentTeacher = '';
let currentStudent = '';
let currentGroupCode = '';

// Флаги для отслеживания состояния синхронизации
let isOnline = navigator.onLine;
let pendingSync = [];

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
async function loginTeacher() {
    const teacherName = document.getElementById('teacherName').value.trim();
    
    if (!teacherName) {
        alert('Введите ваше имя!');
        return;
    }

    currentTeacher = teacherName;
    
    try {
        // Пытаемся загрузить данные из облака
        await loadTeacherFromCloud(teacherName);
        
        // Если учителя нет в облаке, создаем локально
        if (!teachers[teacherName]) {
            teachers[teacherName] = {
                groups: [],
                lastSync: new Date().toISOString()
            };
            await saveTeachers();
        }

        hideAllScreens();
        document.getElementById('teacherPanel').classList.add('active');
        document.getElementById('teacherUserName').textContent = teacherName;
        await loadGroupsList();
        
    } catch (error) {
        console.error('Ошибка входа:', error);
        alert('Ошибка загрузки данных. Работаем в оффлайн режиме.');
        
        // Оффлайн режим
        if (!teachers[teacherName]) {
            teachers[teacherName] = {
                groups: [],
                lastSync: new Date().toISOString()
            };
            saveTeachersToLocal();
        }
        
        hideAllScreens();
        document.getElementById('teacherPanel').classList.add('active');
        document.getElementById('teacherUserName').textContent = teacherName;
        loadGroupsList();
    }
}

// Загрузить учителя из облака
async function loadTeacherFromCloud(teacherName) {
    if (!isOnline) return;
    
    try {
        const teacherDoc = await db.collection('teachers').doc(teacherName).get();
        if (teacherDoc.exists) {
            const cloudData = teacherDoc.data();
            teachers[teacherName] = {
                ...cloudData,
                lastSync: new Date().toISOString()
            };
            
            // Загружаем группы учителя из облака
            for (const groupCode of cloudData.groups || []) {
                await loadGroupFromCloud(groupCode);
            }
            
            saveAllToLocal();
        }
    } catch (error) {
        console.error('Ошибка загрузки из облака:', error);
        throw error;
    }
}

// Загрузить группу из облака
async function loadGroupFromCloud(groupCode) {
    if (!isOnline) return;
    
    try {
        const groupDoc = await db.collection('groups').doc(groupCode).get();
        if (groupDoc.exists) {
            groups[groupCode] = groupDoc.data();
        }
    } catch (error) {
        console.error('Ошибка загрузки группы:', error);
    }
}

// Создать группу
async function createGroup() {
    const groupName = document.getElementById('groupName').value.trim();
    
    if (!groupName) {
        alert('Введите название группы!');
        return;
    }

    // Генерация кода
    const groupCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    // Создание группы
    const newGroup = {
        name: groupName,
        teacher: currentTeacher,
        students: {},
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString()
    };

    groups[groupCode] = newGroup;

    // Добавляем группу учителю
    teachers[currentTeacher].groups.push(groupCode);
    teachers[currentTeacher].lastModified = new Date().toISOString();

    try {
        await saveAllData();
        
        // Показываем код
        document.getElementById('groupCodeDisplay').innerHTML = `
            <div class="code-display">
                Код группы: ${groupCode}
            </div>
            <p>Дайте этот код ученикам</p>
        `;

        document.getElementById('groupName').value = '';
        await loadGroupsList();
        
    } catch (error) {
        console.error('Ошибка сохранения:', error);
        alert('Группа создана локально. Данные синхронизируются при подключении.');
        
        saveAllToLocal();
        document.getElementById('groupCodeDisplay').innerHTML = `
            <div class="code-display">
                Код группы: ${groupCode}
            </div>
            <p>Дайте этот код ученикам</p>
            <p style="color: orange;">⚠ Оффлайн режим</p>
        `;
        document.getElementById('groupName').value = '';
        loadGroupsList();
    }
}

// Сохранить все данные (облако + локально)
async function saveAllData() {
    // Сохраняем локально
    saveAllToLocal();
    
    // Сохраняем в облако если онлайн
    if (isOnline) {
        await saveAllToCloud();
    } else {
        // Добавляем в очередь синхронизации
        addToSyncQueue();
    }
}

// Сохранить все данные в облако
async function saveAllToCloud() {
    if (!isOnline) return;
    
    try {
        const batch = db.batch();
        
        // Сохраняем учителя
        if (currentTeacher && teachers[currentTeacher]) {
            const teacherRef = db.collection('teachers').doc(currentTeacher);
            batch.set(teacherRef, {
                ...teachers[currentTeacher],
                lastSync: new Date().toISOString()
            });
        }
        
        // Сохраняем все группы учителя
        if (currentTeacher && teachers[currentTeacher].groups) {
            for (const groupCode of teachers[currentTeacher].groups) {
                if (groups[groupCode]) {
                    const groupRef = db.collection('groups').doc(groupCode);
                    batch.set(groupRef, {
                        ...groups[groupCode],
                        lastModified: new Date().toISOString()
                    });
                }
            }
        }
        
        await batch.commit();
        console.log('Данные сохранены в облако');
        
    } catch (error) {
        console.error('Ошибка сохранения в облако:', error);
        throw error;
    }
}

// Сохранить все данные локально
function saveAllToLocal() {
    localStorage.setItem('mathTeachers', JSON.stringify(teachers));
    localStorage.setItem('mathGroups', JSON.stringify(groups));
}

// Добавить в очередь синхронизации
function addToSyncQueue() {
    const syncItem = {
        type: 'teacher_update',
        teacher: currentTeacher,
        timestamp: new Date().toISOString()
    };
    
    pendingSync.push(syncItem);
    localStorage.setItem('pendingSync', JSON.stringify(pendingSync));
}

// Синхронизировать данные при подключении
async function syncData() {
    if (!isOnline || pendingSync.length === 0) return;
    
    try {
        await saveAllToCloud();
        pendingSync = [];
        localStorage.removeItem('pendingSync');
        console.log('Данные синхронизированы');
    } catch (error) {
        console.error('Ошибка синхронизации:', error);
    }
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
                `${grade.value} (${grade.topic || 'Без темы'})`
            ).join(', ');
        } else {
            gradesHtml = '<p>Оценок нет</p>';
        }
        
        studentElement.innerHTML = `
            <h4>${studentName}</h4>
            <div>Оценки: ${gradesHtml}</div>
            <div class="grade-inputs">
                <input type="number" id="grade-${studentName}" class="grade-input" min="2" max="5" placeholder="5">
                <input type="text" id="topic-${studentName}" class="topic-input" placeholder="Тема (например: Дроби)">
                <button class="add-grade-btn" onclick="addGrade('${studentName}')">Добавить</button>
            </div>
        `;
        studentsContainer.appendChild(studentElement);
    });
}

// Добавить оценку
async function addGrade(studentName) {
    const gradeInput = document.getElementById(`grade-${studentName}`);
    const topicInput = document.getElementById(`topic-${studentName}`);
    const grade = parseInt(gradeInput.value);
    const topic = topicInput.value.trim() || 'Без темы';
    
    if (grade >= 2 && grade <= 5) {
        if (!groups[currentGroupCode].students[studentName].grades) {
            groups[currentGroupCode].students[studentName].grades = [];
        }
        
        // Добавляем оценку с темой
        groups[currentGroupCode].students[studentName].grades.push({
            value: grade,
            topic: topic,
            date: new Date().toISOString()
        });
        
        groups[currentGroupCode].lastModified = new Date().toISOString();
        
        try {
            await saveAllData();
            viewGroup(currentGroupCode);
        } catch (error) {
            console.error('Ошибка сохранения:', error);
            alert('Оценка добавлена локально. Синхронизация при подключении.');
            saveAllToLocal();
            viewGroup(currentGroupCode);
        }
    } else {
        alert('Введите оценку от 2 до 5!');
    }
    gradeInput.value = '';
    topicInput.value = '';
}

// Удалить группу
async function deleteGroup(groupCode) {
    if (confirm('Удалить эту группу?')) {
        // Удаляем группу у учителя
        teachers[currentTeacher].groups = teachers[currentTeacher].groups.filter(code => code !== groupCode);
        teachers[currentTeacher].lastModified = new Date().toISOString();
        
        // Удаляем саму группу
        delete groups[groupCode];
        
        try {
            await saveAllData();
            loadGroupsList();
        } catch (error) {
            console.error('Ошибка удаления:', error);
            alert('Группа удалена локально. Синхронизация при подключении.');
            saveAllToLocal();
            loadGroupsList();
        }
    }
}

// Назад к панели учителя
function backToTeacherPanel() {
    hideAllScreens();
    document.getElementById('teacherPanel').classList.add('active');
}

// Вход ученика в группу
async function joinGroup() {
    const studentName = document.getElementById('studentName').value.trim();
    const groupCode = document.getElementById('groupCodeInput').value.toUpperCase();
    
    if (!studentName || !groupCode) {
        alert('Заполните все поля!');
        return;
    }
    
    // Сначала проверяем локально
    if (!groups[groupCode]) {
        // Если нет локально, пробуем загрузить из облака
        if (isOnline) {
            try {
                await loadGroupFromCloud(groupCode);
            } catch (error) {
                console.error('Ошибка загрузки группы:', error);
            }
        }
        
        if (!groups[groupCode]) {
            alert('Группа не найдена!');
            return;
        }
    }
    
    // Регистрируем ученика в группе
    if (!groups[groupCode].students[studentName]) {
        groups[groupCode].students[studentName] = {
            grades: []
        };
        groups[groupCode].lastModified = new Date().toISOString();
        
        try {
            await saveAllData();
        } catch (error) {
            console.error('Ошибка сохранения:', error);
            saveAllToLocal();
        }
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
        const totalGrade = studentData.grades.reduce((sum, grade) => sum + grade.value, 0);
        const averageGrade = (totalGrade / studentData.grades.length).toFixed(2);
        
        let gradesHtml = '';
        studentData.grades.forEach((grade, index) => {
            gradesHtml += `
                <div class="grade-details">
                    <span class="grade-with-topic">
                        ${grade.value} (${grade.topic})
                    </span>
                    <small style="color: #666; margin-left: 10px;">${new Date(grade.date).toLocaleDateString()}</small>
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

// Скрыть все экраны
function hideAllScreens() {
    const screens = document.querySelectorAll('.screen');
    screens.forEach(screen => screen.classList.remove('active'));
}

// Обработчики онлайн/оффлайн статуса
window.addEventListener('online', function() {
    isOnline = true;
    console.log('Онлайн, синхронизируем данные...');
    syncData();
});

window.addEventListener('offline', function() {
    isOnline = false;
    console.log('Оффлайн режим');
});

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', function() {
    // Загружаем очередь синхронизации
    pendingSync = JSON.parse(localStorage.getItem('pendingSync')) || [];
    
    // Пытаемся синхронизировать при загрузке если онлайн
    if (isOnline && pendingSync.length > 0) {
        syncData();
    }
    
    showMainScreen();
});

// Старые функции для совместимости
function saveTeachers() {
    saveAllToLocal();
}

function saveGroups() {
    saveAllToLocal();
}



