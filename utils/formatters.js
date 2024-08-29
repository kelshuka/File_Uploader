
const { formatDistanceToNow, isToday, isYesterday, differenceInDays, differenceInMonths} = require('date-fns');

function formatDate (dateString){
    const inputDate = new Date(dateString);
    const now = new Date();

    // Check if the date is within 24 hours
    if (isToday(inputDate)){
        return formatDistanceToNow(inputDate, { addSuffix: true });
    }
    // Check if the date is yesterday
    if(isYesterday(inputDate)){
        return 'Yesterday';
    }
    // Difference in days
    const daysDifference = differenceInDays(now, inputDate);
    if (daysDifference < 30) {
        return `${daysDifference} days ago`;
    }
    // Difference in months
    const monthsDifference = differenceInMonths(now, inputDate);
    if(monthsDifference < 12){
        return `${monthsDifference} months ago`;
    }
    // Fallback to year calculation (if needed)
    const yearsDifference = Math.floor(monthsDifference / 12);
    return `${yearsDifference} years ago`;
}

function formatBytes (bytes) {
    if(bytes === 0) return '0 Byte';
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
    return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
}




module.exports = {
    formatDate,
    formatBytes
};


