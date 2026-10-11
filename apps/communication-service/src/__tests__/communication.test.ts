import { communicationRepository } from '../db/communication.repository';
import { announcementsService } from '../services/announcements.service';
import { forumService } from '../services/forum.service';
import { notificationsService } from '../services/notifications.service';
import { aiService } from '../services/ai.service';

async function runTests() {
  console.log('🧪 Running Communication Service Integration Tests...\n');
  await communicationRepository.initialize();

  // 1. ANNOUNCEMENTS
  console.log('1️⃣ Testing Announcements...');
  const newAnn = await announcementsService.createAnnouncement(
    {
      title: 'Test System Announcement',
      content: 'This is a test announcement created for automated testing.',
      type: 'IMPORTANT',
      targetAudience: 'ALL',
      isPublished: true,
    },
    { id: 'test-admin-1', name: 'Test Admin', role: 'ADMIN' }
  );
  console.log('  ✅ Created Announcement:', newAnn.id, newAnn.title);

  const list = await announcementsService.getAnnouncements();
  if (list.length === 0) throw new Error('Failed to retrieve announcements');
  console.log('  ✅ Retrieved Announcements count:', list.length);

  const updatedAnn = await announcementsService.updateAnnouncement(
    newAnn.id,
    { title: 'Updated Test System Announcement' },
    { id: 'test-admin-1', role: 'ADMIN' }
  );
  if (updatedAnn.title !== 'Updated Test System Announcement') throw new Error('Announcement update failed');
  console.log('  ✅ Updated Announcement title successfully');

  // 2. FORUM
  console.log('\n2️⃣ Testing Forum (Categories, Discussions, Comments)...');
  const categories = await forumService.getCategories();
  if (categories.length === 0) throw new Error('Failed to get forum categories');
  console.log('  ✅ Retrieved Categories count:', categories.length);

  const newDisc = await forumService.createDiscussion(
    {
      categoryId: categories[0].id,
      title: 'How do microservices talk in CloudLab?',
      content: 'Can someone explain the API Gateway routing mechanism?',
    },
    { id: 'student-1', name: 'Alice Student', role: 'STUDENT' }
  );
  console.log('  ✅ Created Discussion:', newDisc.id, newDisc.title);

  const comment = await forumService.addComment(
    newDisc.id,
    { content: 'The API Gateway proxies calls to individual microservices via http-proxy-middleware!' },
    { id: 'instructor-1', name: 'Bob Instructor', role: 'INSTRUCTOR' }
  );
  console.log('  ✅ Added Comment:', comment.id);

  const solvedDisc = await forumService.markSolved(newDisc.id, comment.id, { id: 'student-1', role: 'STUDENT' });
  if (solvedDisc.status !== 'SOLVED' || solvedDisc.acceptedCommentId !== comment.id) {
    throw new Error('Failed to mark discussion solved');
  }
  console.log('  ✅ Marked Discussion Solved with accepted answer');

  // 3. NOTIFICATIONS
  console.log('\n3️⃣ Testing Notifications...');
  const userNotifs = await notificationsService.getUserNotifications('student-1');
  console.log('  ✅ Retrieved User Notifications count:', userNotifs.length);

  const unreadCountBefore = await notificationsService.getUnreadCount('student-1');
  console.log('  ✅ Unread Count:', unreadCountBefore.count);

  if (userNotifs.length > 0) {
    await notificationsService.markAsRead(userNotifs[0].id, 'student-1');
    const unreadCountAfter = await notificationsService.getUnreadCount('student-1');
    console.log('  ✅ Marked single notification read. New count:', unreadCountAfter.count);
  }

  // 4. AI ASSISTANT
  console.log('\n4️⃣ Testing AI Assistant Service...');
  const aiResponse = await aiService.handleChat({
    messages: [{ role: 'user', content: 'How do I create a project in CloudLab?' }],
  });
  if (!aiResponse.message || !aiResponse.message.content) {
    throw new Error('AI Assistant returned empty response');
  }
  console.log('  ✅ AI Assistant Response generated:');
  console.log('  ---');
  console.log(' ', aiResponse.message.content.split('\n')[0]);
  console.log('  ---');

  console.log('\n✨ ALL COMMUNICATION SERVICE TESTS PASSED SUCCESSFULLY!');
  process.exit(0);
}

runTests().catch((err) => {
  console.error('❌ Communication Test Failed:', err);
  process.exit(1);
});
