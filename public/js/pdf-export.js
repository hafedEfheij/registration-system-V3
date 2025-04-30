/**
 * PDF Export functionality
 * This file contains functions for exporting data to PDF format using html2pdf
 */

// Function to convert Arabic/Hindi numerals to Arabic/Latin numerals
function convertToArabicNumerals(str) {
    if (!str) return str;

    // Convert string to ensure we're working with a string
    str = String(str);

    // Replace Arabic/Hindi numerals with Arabic/Latin numerals
    return str.replace(/[٠١٢٣٤٥٦٧٨٩]/g, function(d) {
        return d.charCodeAt(0) - 1632; // Convert to the corresponding Arabic/Latin numeral
    });
}

// Function to format date in Arabic with Latin numerals
function formatDateWithLatinNumerals(date) {
    if (!date) return '';

    // Create a date object if string is provided
    if (typeof date === 'string') {
        date = new Date(date);
    }

    // Format date using Arabic locale
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    let formattedDate = date.toLocaleDateString('ar', options);

    // Convert numerals to Latin format
    return convertToArabicNumerals(formattedDate);
}

// Function to create HTML content for the report
function createReportHtml(course, students) {
    // Format date with Latin numerals
    const reportDate = formatDateWithLatinNumerals(new Date());

    // Format course data with Latin numerals
    const enrolledStudents = convertToArabicNumerals(course.enrolled_students);
    const maxStudents = convertToArabicNumerals(course.max_students);
    const enrollmentPercentage = convertToArabicNumerals(course.enrollment_percentage.toFixed(2));

    // Create HTML content
    let html = `
    <div class="pdf-container" dir="rtl" style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="font-size: 24px; color: #333;">قائمة الطلبة المسجلين في مادة ${course.name}</h1>
        </div>

        <div style="margin-bottom: 20px; background-color: #f8f9fa; padding: 15px; border-radius: 5px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                <div style="width: 48%;">
                    <p><strong>رمز المادة:</strong> ${convertToArabicNumerals(course.course_code)}</p>
                    <p><strong>التخصص:</strong> ${course.department_name || 'غير محدد'}</p>
                </div>
                <div style="width: 48%;">
                    <p><strong>عدد الطلبة المسجلين:</strong> ${enrolledStudents} / ${maxStudents}</p>
                    <p><strong>نسبة التسجيل:</strong> ${enrollmentPercentage} %</p>
                </div>
            </div>
            <p><strong>تاريخ التقرير:</strong> ${reportDate}</p>
        </div>

        <div style="margin-bottom: 20px;">
            <table style="width: 100%; border-collapse: collapse; text-align: right;">
                <thead>
                    <tr style="background-color: #343a40; color: white;">
                        <th style="padding: 10px; border: 1px solid #dee2e6;">رقم</th>
                        <th style="padding: 10px; border: 1px solid #dee2e6;">رقم القيد</th>
                        <th style="padding: 10px; border: 1px solid #dee2e6;">اسم الطالب</th>
                        <th style="padding: 10px; border: 1px solid #dee2e6;">رقم المنظومة</th>
                        <th style="padding: 10px; border: 1px solid #dee2e6;">التخصص</th>
                        <th style="padding: 10px; border: 1px solid #dee2e6;">الفصل الدراسي</th>
                        <th style="padding: 10px; border: 1px solid #dee2e6;">تاريخ التسجيل</th>
                    </tr>
                </thead>
                <tbody>
    `;

    // Add student rows
    if (students.length === 0) {
        html += `
            <tr>
                <td colspan="7" style="padding: 10px; border: 1px solid #dee2e6; text-align: center;">لا يوجد طلبة مسجلين في هذه المادة</td>
            </tr>
        `;
    } else {
        students.forEach((student, index) => {
            // Format date with Latin numerals
            const formattedDate = formatDateWithLatinNumerals(student.enrollment_date);

            // Format student data with Latin numerals
            const rowNumber = convertToArabicNumerals(index + 1);
            const studentId = convertToArabicNumerals(student.student_id);
            const registrationNumber = convertToArabicNumerals(student.registration_number);

            // Add row with alternating background color
            const bgColor = index % 2 === 0 ? '#f8f9fa' : 'white';

            // Ensure semester has a value
            const semester = student.semester || 'الأول';

            html += `
                <tr style="background-color: ${bgColor};">
                    <td style="padding: 10px; border: 1px solid #dee2e6; text-align: center;">${rowNumber}</td>
                    <td style="padding: 10px; border: 1px solid #dee2e6;">${studentId}</td>
                    <td style="padding: 10px; border: 1px solid #dee2e6;">${student.name}</td>
                    <td style="padding: 10px; border: 1px solid #dee2e6;">${registrationNumber}</td>
                    <td style="padding: 10px; border: 1px solid #dee2e6;">${student.department_name || 'غير محدد'}</td>
                    <td style="padding: 10px; border: 1px solid #dee2e6;">${semester}</td>
                    <td style="padding: 10px; border: 1px solid #dee2e6;">${formattedDate}</td>
                </tr>
            `;
        });
    }

    // Close table and container
    html += `
                </tbody>
            </table>
        </div>

        <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #6c757d;">
            <p>تم إنشاء هذا التقرير في: ${reportDate}</p>
        </div>
    </div>
    `;

    return html;
}

// Function to export students data to PDF
function exportStudentsToPdf(course, students) {
    try {
        // Create HTML content
        const htmlContent = createReportHtml(course, students);

        // Create a temporary container for the HTML content
        const element = document.createElement('div');
        element.innerHTML = htmlContent;
        document.body.appendChild(element);

        // Show message
        alert('جاري إنشاء ملف PDF، يرجى الانتظار...');

        // Use simpler approach with html2pdf
        const filename = `طلبة_${course.course_code}_${new Date().toISOString().slice(0,10)}.pdf`;

        // Use timeout to allow the DOM to update
        setTimeout(() => {
            html2pdf(element, {
                margin: 10,
                filename: filename,
                image: { type: 'jpeg', quality: 1 },
                html2canvas: { scale: 2 },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            }).then(() => {
                // Remove the temporary element
                document.body.removeChild(element);

                // Show success message
                alert('تم تصدير بيانات الطلبة بنجاح بتنسيق PDF');
            }).catch(error => {
                console.error('Error in html2pdf:', error);
                document.body.removeChild(element);
                alert('حدث خطأ أثناء إنشاء PDF: ' + error.message);

                // Fallback to HTML download
                downloadAsHtml(course, students);
            });
        }, 500);
    } catch (error) {
        console.error('Error exporting to PDF:', error);
        alert('حدث خطأ أثناء تصدير البيانات: ' + error.message);

        // Fallback to HTML download
        downloadAsHtml(course, students);
    }
}

// Function to view students data as PDF in a new window
function viewStudentsAsPdf(course, students) {
    try {
        // Create HTML content
        const htmlContent = createReportHtml(course, students);

        // Open a new window
        const newWindow = window.open('', '_blank');

        // Write the HTML content to the new window
        newWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>تقرير الطلبة المسجلين في مادة ${course.name}</title>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    @media print {
                        body {
                            font-family: Arial, sans-serif;
                        }
                        .print-button {
                            display: none;
                        }
                    }
                    .print-button {
                        position: fixed;
                        top: 20px;
                        right: 20px;
                        padding: 10px 20px;
                        background-color: #007bff;
                        color: white;
                        border: none;
                        border-radius: 5px;
                        cursor: pointer;
                        font-size: 16px;
                    }
                    .print-button:hover {
                        background-color: #0056b3;
                    }
                </style>
            </head>
            <body>
                <button class="print-button" onclick="window.print()">طباعة التقرير</button>
                ${htmlContent}
            </body>
            </html>
        `);

        // Close the document
        newWindow.document.close();

    } catch (error) {
        console.error('Error opening report:', error);
        alert('حدث خطأ أثناء فتح التقرير: ' + error.message);

        // Fallback to HTML download
        downloadAsHtml(course, students);
    }
}

// Function to download report as HTML
function downloadAsHtml(course, students) {
    try {
        // Create HTML content
        const htmlContent = createReportHtml(course, students);

        // Create full HTML document
        const fullHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>تقرير الطلبة المسجلين في مادة ${course.name}</title>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    @media print {
                        body {
                            font-family: Arial, sans-serif;
                        }
                    }
                </style>
            </head>
            <body>
                ${htmlContent}
            </body>
            </html>
        `;

        // Create a blob with the HTML content
        const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });

        // Create a download link
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `طلبة_${course.course_code}_${new Date().toISOString().slice(0,10)}.html`;

        // Append the link to the document, click it, and remove it
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Show success message
        alert('تم تصدير بيانات الطلبة بنجاح بتنسيق HTML. يمكنك فتح الملف وطباعته من المتصفح.');
    } catch (error) {
        console.error('Error downloading HTML:', error);
        alert('حدث خطأ أثناء تصدير البيانات: ' + error.message);
    }
}
