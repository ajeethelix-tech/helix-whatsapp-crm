// ============================================================
// HELIX BIOFAST LABS — CRM Single Page Application (app.js)
// Real-Time Socket.IO & REST Client Integration
// ============================================================

const socket = io();

// State Store
const state = {
  currentTab: 'dashboard',
  stats: {},
  leads: [],
  chats: [],
  selectedChatId: null,
  filters: { status: 'All', category: 'All', search: '' },
  chatTimeFilter: 'all', // 'all', '24h', '48h', 'fresh', 'unread'
  chatFreshOnly: false,  // true: only brand new inquiries started in timeframe
  chatSearchQuery: '',

  // Drip Campaign State
  dripStats: {},
  dripSubscribers: [],
  dripLogs: [],
  dripTemplates: [],
  dripSubtab: 'queue',
  dripTemplateCampaign: 'inquiry',
  dripFilters: { status: 'All', campaign: 'All', search: '' },
  dripLogsSearch: '',
  dripExcelRawRows: [],
  dripExcelColumns: [],
  dripExcelParsedStudents: [],

  // Lab Visits Directory State
  labVisits: [],
  labVisitFilters: { search: '', course: 'All', status: 'All' },

  // Call Inquiries Directory State
  callInquiries: [],
  callInquiryFilters: { search: '', course: 'All', status: 'All' },

  // Custom Campaigns State
  campaigns: [],
  selectedCampaignFile: null,

  // Institutional State
  institutions: [],
  institutionFilters: { status: 'All', search: '' },

  // College Faculties Directory State
  faculties: [],
  facultyFilters: { department: '', search: '' },
  editingFacultyId: null,

  // WhatsApp Contacts State
  contacts: [],
  contactsTotal: 0,
  contactsPage: 1,
  contactsLimit: 50,
  contactsFilters: { search: '', savedOnly: false },

  // Excel Contacts Upload State
  excelContacts: [],
  excelColumns: [],
  excelRawRows: [],
  excelSelectedNameCol: '',
  excelSelectedPhoneCol: '',

  // Talk to Team (Option 6) State
  talkToTeamLeads: [],
  talkToTeamFilters: { search: '', status: 'All' }
};

// DOM Elements
const elements = {
  tabs: document.querySelectorAll('.tab-content'),
  menuItems: document.querySelectorAll('.menu-item'),
  currentPageTitle: document.getElementById('currentPageTitle'),
  statusDot: document.getElementById('statusDot'),
  statusText: document.getElementById('statusText'),
  statusSub: document.getElementById('statusSub'),

  // Stats
  statTotalLeads: document.getElementById('statTotalLeads'),
  statNewLeads: document.getElementById('statNewLeads'),
  statInProgress: document.getElementById('statInProgress'),
  statEnrolled: document.getElementById('statEnrolled'),
  statTalkToTeam: document.getElementById('statTalkToTeam'),
  dashTalkToTeamCount: document.getElementById('dashTalkToTeamCount'),
  dashTalkToTeamTableBody: document.getElementById('dashTalkToTeamTableBody'),
  categoryBreakdownList: document.getElementById('categoryBreakdownList'),
  qrWidgetContainer: document.getElementById('qrWidgetContainer'),

  // Talk to Team Modal Elements
  modalTalkToTeam: document.getElementById('modalTalkToTeam'),
  talkToTeamSearchInput: document.getElementById('talkToTeamSearchInput'),
  talkToTeamStatusFilter: document.getElementById('talkToTeamStatusFilter'),
  talkToTeamTableBody: document.getElementById('talkToTeamTableBody'),
  talkToTeamTotalSummary: document.getElementById('talkToTeamTotalSummary'),

  // Leads
  leadSearchInput: document.getElementById('leadSearchInput'),
  leadStatusFilter: document.getElementById('leadStatusFilter'),
  leadCategoryFilter: document.getElementById('leadCategoryFilter'),
  leadsTableBody: document.getElementById('leadsTableBody'),

  // Edit Modal
  editLeadModal: document.getElementById('editLeadModal'),
  editLeadId: document.getElementById('editLeadId'),
  editLeadName: document.getElementById('editLeadName'),
  editLeadPhone: document.getElementById('editLeadPhone'),
  editLeadStatus: document.getElementById('editLeadStatus'),
  editLeadCategory: document.getElementById('editLeadCategory'),
  editLeadNotes: document.getElementById('editLeadNotes'),
  btnCloseModal: document.getElementById('btnCloseModal'),
  btnCancelEdit: document.getElementById('btnCancelEdit'),
  btnSaveLead: document.getElementById('btnSaveLead'),

  // Inbox
  chatThreadsList: document.getElementById('chatThreadsList'),
  chatSearchInput: document.getElementById('chatSearchInput'),
  btnOpenNewChatModal: document.getElementById('btnOpenNewChatModal'),
  modalNewChatFromContacts: document.getElementById('modalNewChatFromContacts'),
  btnCloseNewChatModal: document.getElementById('btnCloseNewChatModal'),
  btnCancelNewChatModal: document.getElementById('btnCancelNewChatModal'),
  newChatContactSearchInput: document.getElementById('newChatContactSearchInput'),
  newChatContactsList: document.getElementById('newChatContactsList'),
  chatTimeFilters: document.getElementById('chatTimeFilters'),
  btnFilterAll: document.getElementById('btnFilterAll'),
  btnFilter24h: document.getElementById('btnFilter24h'),
  btnFilter48h: document.getElementById('btnFilter48h'),
  btnFilterFresh: document.getElementById('btnFilterFresh'),
  btnFilterUnread: document.getElementById('btnFilterUnread'),
  countChatsAll: document.getElementById('countChatsAll'),
  countChats24h: document.getElementById('countChats24h'),
  countChats48h: document.getElementById('countChats48h'),
  countChatsFresh: document.getElementById('countChatsFresh'),
  countChatsUnread: document.getElementById('countChatsUnread'),
  chatInquirySubfilter: document.getElementById('chatInquirySubfilter'),
  btnSubfilterAll: document.getElementById('btnSubfilterAll'),
  btnSubfilterFresh: document.getElementById('btnSubfilterFresh'),
  countSubfilterAll: document.getElementById('countSubfilterAll'),
  countSubfilterFresh: document.getElementById('countSubfilterFresh'),
  chatHeaderTime: document.getElementById('chatHeaderTime'),
  noChatSelected: document.getElementById('noChatSelected'),
  chatActiveView: document.getElementById('chatActiveView'),
  chatAvatar: document.getElementById('chatAvatar'),
  chatHeaderName: document.getElementById('chatHeaderName'),
  chatHeaderPhone: document.getElementById('chatHeaderPhone'),
  chatMessagesBody: document.getElementById('chatMessagesBody'),
  chatInput: document.getElementById('chatInput'),
  btnSendMessage: document.getElementById('btnSendMessage'),
  toggleAutoReply: document.getElementById('toggleAutoReply'),
  unreadBadge: document.getElementById('unreadBadge'),
  chatFileInput: document.getElementById('chatFileInput'),
  btnAttachChatFile: document.getElementById('btnAttachChatFile'),
  chatAttachmentPreview: document.getElementById('chatAttachmentPreview'),
  chatAttachmentName: document.getElementById('chatAttachmentName'),
  chatAttachmentSize: document.getElementById('chatAttachmentSize'),
  btnRemoveChatAttachment: document.getElementById('btnRemoveChatAttachment'),

  // Drip Campaigns Elements
  dripStatActive: document.getElementById('dripStatActive'),
  dripStatToday: document.getElementById('dripStatToday'),
  dripStatTotal: document.getElementById('dripStatTotal'),
  dripStatCompleted: document.getElementById('dripStatCompleted'),

  btnSubtabQueue: document.getElementById('btnSubtabQueue'),
  btnSubtabLabVisits: document.getElementById('btnSubtabLabVisits'),
  badgeLabVisitCount: document.getElementById('badgeLabVisitCount'),
  badgeLabVisitTotal: document.getElementById('badgeLabVisitTotal'),
  btnExportLabVisitsExcelTop: document.getElementById('btnExportLabVisitsExcelTop'),
  btnSubtabLogs: document.getElementById('btnSubtabLogs'),
  btnSubtabTemplates: document.getElementById('btnSubtabTemplates'),
  btnSubtabStopDrip: document.getElementById('btnSubtabStopDrip'),
  btnSubtabConsent: document.getElementById('btnSubtabConsent'),
  badgeConsentInterested: document.getElementById('badgeConsentInterested'),
  badgeConsentNotInterested: document.getElementById('badgeConsentNotInterested'),
  btnExportConsentExcelTop: document.getElementById('btnExportConsentExcelTop'),
  viewDripConsent: document.getElementById('viewDripConsent'),
  consentInterestedCount: document.getElementById('consentInterestedCount'),
  consentNotInterestedCount: document.getElementById('consentNotInterestedCount'),
  dripConsentInterestedBody: document.getElementById('dripConsentInterestedBody'),
  dripConsentNotInterestedBody: document.getElementById('dripConsentNotInterestedBody'),
  searchInterestedInput: document.getElementById('searchInterestedInput'),
  searchNotInterestedInput: document.getElementById('searchNotInterestedInput'),
  btnExportInterestedCsv: document.getElementById('btnExportInterestedCsv'),
  btnExportNotInterestedCsv: document.getElementById('btnExportNotInterestedCsv'),
  viewDripQueue: document.getElementById('viewDripQueue'),
  viewDripLabVisits: document.getElementById('viewDripLabVisits'),
  viewDripLogs: document.getElementById('viewDripLogs'),
  viewDripTemplates: document.getElementById('viewDripTemplates'),
  viewDripStopControls: document.getElementById('viewDripStopControls'),
  btnHeaderStopAllDrip: document.getElementById('btnHeaderStopAllDrip'),
  dripStoppedWarningBanner: document.getElementById('dripStoppedWarningBanner'),
  btnBannerResumeDrip: document.getElementById('btnBannerResumeDrip'),
  dripControlStatusCard: document.getElementById('dripControlStatusCard'),
  dripControlStatusIcon: document.getElementById('dripControlStatusIcon'),
  dripControlStatusBadge: document.getElementById('dripControlStatusBadge'),
  dripControlStatusDesc: document.getElementById('dripControlStatusDesc'),
  btnPanelStopAllDrip: document.getElementById('btnPanelStopAllDrip'),
  btnPanelResumeAllDrip: document.getElementById('btnPanelResumeAllDrip'),
  btnCardStopAll: document.getElementById('btnCardStopAll'),
  btnCardResumeAll: document.getElementById('btnCardResumeAll'),
  ctrlBadgeInquiryStatus: document.getElementById('ctrlBadgeInquiryStatus'),
  ctrlInquiryActive: document.getElementById('ctrlInquiryActive'),
  ctrlInquiryPaused: document.getElementById('ctrlInquiryPaused'),
  ctrlBadgeCallStatus: document.getElementById('ctrlBadgeCallStatus'),
  ctrlCallActive: document.getElementById('ctrlCallActive'),
  ctrlCallPaused: document.getElementById('ctrlCallPaused'),
  ctrlBadgeLabStatus: document.getElementById('ctrlBadgeLabStatus'),
  ctrlLabActive: document.getElementById('ctrlLabActive'),
  ctrlLabPaused: document.getElementById('ctrlLabPaused'),

  labVisitsSearchInput: document.getElementById('labVisitsSearchInput'),
  labVisitsCourseFilter: document.getElementById('labVisitsCourseFilter'),
  labVisitsStatusFilter: document.getElementById('labVisitsStatusFilter'),
  btnDownloadLabVisitsExcel: document.getElementById('btnDownloadLabVisitsExcel'),
  btnDownloadLabVisitsCsv: document.getElementById('btnDownloadLabVisitsCsv'),
  btnLaunchLabVisitCampaign: document.getElementById('btnLaunchLabVisitCampaign'),
  labVisitsTableBody: document.getElementById('labVisitsTableBody'),

  boxAudienceLabVisits: document.getElementById('boxAudienceLabVisits'),
  campaignLabVisitsCount: document.getElementById('campaignLabVisitsCount'),
  btnExportLabVisitsFromCampaign: document.getElementById('btnExportLabVisitsFromCampaign'),

  btnSubtabCallInquiries: document.getElementById('btnSubtabCallInquiries'),
  badgeCallInquiryCount: document.getElementById('badgeCallInquiryCount'),
  badgeCallInquiryTotal: document.getElementById('badgeCallInquiryTotal'),
  btnExportCallInquiriesExcelTop: document.getElementById('btnExportCallInquiriesExcelTop'),
  viewDripCallInquiries: document.getElementById('viewDripCallInquiries'),
  callInquiriesSearchInput: document.getElementById('callInquiriesSearchInput'),
  callInquiriesCourseFilter: document.getElementById('callInquiriesCourseFilter'),
  callInquiriesStatusFilter: document.getElementById('callInquiriesStatusFilter'),
  btnDownloadCallInquiriesExcel: document.getElementById('btnDownloadCallInquiriesExcel'),
  btnDownloadCallInquiriesCsv: document.getElementById('btnDownloadCallInquiriesCsv'),
  btnLaunchCallInquiryCampaign: document.getElementById('btnLaunchCallInquiryCampaign'),
  callInquiriesTableBody: document.getElementById('callInquiriesTableBody'),

  boxAudienceCallInquiries: document.getElementById('boxAudienceCallInquiries'),
  campaignCallInquiriesCount: document.getElementById('campaignCallInquiriesCount'),
  btnExportCallInquiriesFromCampaign: document.getElementById('btnExportCallInquiriesFromCampaign'),

  dripQueueSearchInput: document.getElementById('dripQueueSearchInput'),
  dripQueueStatusFilter: document.getElementById('dripQueueStatusFilter'),
  dripQueueCampaignFilter: document.getElementById('dripQueueCampaignFilter'),
  dripSubscribersTableBody: document.getElementById('dripSubscribersTableBody'),

  dripLogsSearchInput: document.getElementById('dripLogsSearchInput'),
  dripLogsTableBody: document.getElementById('dripLogsTableBody'),

  btnToggleTplInquiry: document.getElementById('btnToggleTplInquiry'),
  btnToggleTplLabVisit: document.getElementById('btnToggleTplLabVisit'),
  dripTemplatesList: document.getElementById('dripTemplatesList'),

  btnOpenAddLabVisit: document.getElementById('btnOpenAddLabVisit'),
  modalAddLabVisit: document.getElementById('modalAddLabVisit'),
  btnCloseLabVisitModal: document.getElementById('btnCloseLabVisitModal'),
  btnCancelLabVisit: document.getElementById('btnCancelLabVisit'),
  btnSubmitLabVisit: document.getElementById('btnSubmitLabVisit'),
  formAddLabVisit: document.getElementById('formAddLabVisit'),
  labVisitName: document.getElementById('labVisitName'),
  labVisitPhone: document.getElementById('labVisitPhone'),
  labVisitCourse: document.getElementById('labVisitCourse'),
  labVisitDate: document.getElementById('labVisitDate'),
  labVisitNotes: document.getElementById('labVisitNotes'),

  // Call Inquiry Modal Elements
  btnOpenAddCallInquiry: document.getElementById('btnOpenAddCallInquiry'),
  modalAddCallInquiry: document.getElementById('modalAddCallInquiry'),
  btnCloseCallInquiryModal: document.getElementById('btnCloseCallInquiryModal'),
  btnCancelCallInquiry: document.getElementById('btnCancelCallInquiry'),
  btnSubmitCallInquiry: document.getElementById('btnSubmitCallInquiry'),
  formAddCallInquiry: document.getElementById('formAddCallInquiry'),
  callInquiryName: document.getElementById('callInquiryName'),
  callInquiryPhone: document.getElementById('callInquiryPhone'),
  callInquiryCourse: document.getElementById('callInquiryCourse'),
  callInquiryCampaignType: document.getElementById('callInquiryCampaignType'),
  callInquiryScheduleMode: document.getElementById('callInquiryScheduleMode'),
  callInquiryDate: document.getElementById('callInquiryDate'),
  callInquiryNotes: document.getElementById('callInquiryNotes'),

  // Drip Excel Import Elements
  btnOpenDripExcelModal: document.getElementById('btnOpenDripExcelModal'),
  modalDripImportExcel: document.getElementById('modalDripImportExcel'),
  btnCloseDripExcelModal: document.getElementById('btnCloseDripExcelModal'),
  btnCancelDripExcel: document.getElementById('btnCancelDripExcel'),
  btnDownloadDripSampleExcel: document.getElementById('btnDownloadDripSampleExcel'),
  dripImportCampaignType: document.getElementById('dripImportCampaignType'),
  dripImportScheduleMode: document.getElementById('dripImportScheduleMode'),
  dripExcelDropzone: document.getElementById('dripExcelDropzone'),
  dripExcelFileInput: document.getElementById('dripExcelFileInput'),
  dripExcelMappingSection: document.getElementById('dripExcelMappingSection'),
  dripExcelNameCol: document.getElementById('dripExcelNameCol'),
  dripExcelPhoneCol: document.getElementById('dripExcelPhoneCol'),
  dripExcelCourseCol: document.getElementById('dripExcelCourseCol'),
  dripExcelNotesCol: document.getElementById('dripExcelNotesCol'),
  dripExcelPreviewSection: document.getElementById('dripExcelPreviewSection'),
  dripExcelSummaryBadge: document.getElementById('dripExcelSummaryBadge'),
  dripExcelPreviewBody: document.getElementById('dripExcelPreviewBody'),
  btnSubmitDripExcelImport: document.getElementById('btnSubmitDripExcelImport'),

  modalEditTemplate: document.getElementById('modalEditTemplate'),
  btnCloseEditTemplate: document.getElementById('btnCloseEditTemplate'),
  btnCancelEditTemplate: document.getElementById('btnCancelEditTemplate'),
  btnSaveTemplate: document.getElementById('btnSaveTemplate'),
  formEditTemplate: document.getElementById('formEditTemplate'),
  editTemplateId: document.getElementById('editTemplateId'),
  editTemplateTitle: document.getElementById('editTemplateTitle'),
  editTemplateMessage: document.getElementById('editTemplateMessage'),

  // Custom Campaigns Elements
  statTotalCampaigns: document.getElementById('statTotalCampaigns'),
  statCampaignsSent: document.getElementById('statCampaignsSent'),
  statMediaBroadcasts: document.getElementById('statMediaBroadcasts'),
  campaignStatusBadge: document.getElementById('campaignStatusBadge'),
  campaignProgressBox: document.getElementById('campaignProgressBox'),
  campaignProgressTitle: document.getElementById('campaignProgressTitle'),
  campaignProgressRatio: document.getElementById('campaignProgressRatio'),
  campaignProgressBar: document.getElementById('campaignProgressBar'),
  btnStopCampaign: document.getElementById('btnStopCampaign'),
  btnEmergencyStopCampaign: document.getElementById('btnEmergencyStopCampaign'),
  btnNavbarStopBroadcast: document.getElementById('btnNavbarStopBroadcast'),
  formCreateCampaign: document.getElementById('formCreateCampaign'),
  campaignTitle: document.getElementById('campaignTitle'),
  campaignAudienceType: document.getElementById('campaignAudienceType'),
  boxAudienceCustom: document.getElementById('boxAudienceCustom'),
  campaignCustomNumbers: document.getElementById('campaignCustomNumbers'),
  boxAudienceLeads: document.getElementById('boxAudienceLeads'),
  campaignLeadCategory: document.getElementById('campaignLeadCategory'),
  campaignLeadStatus: document.getElementById('campaignLeadStatus'),
  campaignLeadCount: document.getElementById('campaignLeadCount'),
  campaignMessage: document.getElementById('campaignMessage'),
  campaignDropzone: document.getElementById('campaignDropzone'),
  campaignFileInput: document.getElementById('campaignFileInput'),
  btnBrowseFile: document.getElementById('btnBrowseFile'),
  campaignFileInfo: document.getElementById('campaignFileInfo'),
  btnRemoveAttachment: document.getElementById('btnRemoveAttachment'),
  btnLaunchCampaign: document.getElementById('btnLaunchCampaign'),
  campaignSpeedMode: document.getElementById('campaignSpeedMode'),
  campaignsTableBody: document.getElementById('campaignsTableBody'),
  modalCampaignLogs: document.getElementById('modalCampaignLogs'),
  campaignLogsModalTitle: document.getElementById('campaignLogsModalTitle'),
  btnCloseCampaignLogsModal: document.getElementById('btnCloseCampaignLogsModal'),
  btnCloseCampaignLogs: document.getElementById('btnCloseCampaignLogs'),
  campaignLogsTableBody: document.getElementById('campaignLogsTableBody'),

  // Excel Contacts Upload Elements
  boxAudienceExcel: document.getElementById('boxAudienceExcel'),
  campaignExcelFileInput: document.getElementById('campaignExcelFileInput'),
  btnBrowseExcelFile: document.getElementById('btnBrowseExcelFile'),
  btnDownloadSampleExcel: document.getElementById('btnDownloadSampleExcel'),
  campaignExcelFileName: document.getElementById('campaignExcelFileName'),
  btnRemoveExcelFile: document.getElementById('btnRemoveExcelFile'),
  boxExcelDetails: document.getElementById('boxExcelDetails'),
  excelNameColumn: document.getElementById('excelNameColumn'),
  excelPhoneColumn: document.getElementById('excelPhoneColumn'),
  campaignExcelCount: document.getElementById('campaignExcelCount'),
  campaignExcelInvalidCount: document.getElementById('campaignExcelInvalidCount'),
  excelPreviewTableBody: document.getElementById('excelPreviewTableBody'),
  boxDynamicPlaceholders: document.getElementById('boxDynamicPlaceholders'),

  // Institutional & Workshops Elements
  statInstTotal: document.getElementById('statInstTotal'),
  statInstMou: document.getElementById('statInstMou'),
  statInstScheduled: document.getElementById('statInstScheduled'),
  statInstStudents: document.getElementById('statInstStudents'),
  btnOpenAddInstitution: document.getElementById('btnOpenAddInstitution'),
  modalAddInstitution: document.getElementById('modalAddInstitution'),
  btnCloseInstModal: document.getElementById('btnCloseInstModal'),
  btnCancelInstModal: document.getElementById('btnCancelInstModal'),
  btnSubmitInstitution: document.getElementById('btnSubmitInstitution'),
  formAddInstitution: document.getElementById('formAddInstitution'),
  instCollegeName: document.getElementById('instCollegeName'),
  instFacultyName: document.getElementById('instFacultyName'),
  instPhone: document.getElementById('instPhone'),
  instDepartment: document.getElementById('instDepartment'),
  instWorkshopTopic: document.getElementById('instWorkshopTopic'),
  instEstimatedStudents: document.getElementById('instEstimatedStudents'),
  instPreferredDate: document.getElementById('instPreferredDate'),
  instStatus: document.getElementById('instStatus'),
  instNotes: document.getElementById('instNotes'),
  instSearchInput: document.getElementById('instSearchInput'),
  instStatusFilter: document.getElementById('instStatusFilter'),
  institutionsTableBody: document.getElementById('institutionsTableBody'),

  // College Faculty Directory Elements
  statTotalFaculties: document.getElementById('statTotalFaculties'),
  statFacultyColleges: document.getElementById('statFacultyColleges'),
  statFacultyBiotech: document.getElementById('statFacultyBiotech'),
  btnOpenAddFaculty: document.getElementById('btnOpenAddFaculty'),
  btnExportFacultiesCsv: document.getElementById('btnExportFacultiesCsv'),
  facultySearchInput: document.getElementById('facultySearchInput'),
  facultyDeptFilter: document.getElementById('facultyDeptFilter'),
  facultiesTableBody: document.getElementById('facultiesTableBody'),

  // Faculty Modal Elements
  modalAddFaculty: document.getElementById('modalAddFaculty'),
  facultyModalTitle: document.getElementById('facultyModalTitle'),
  btnCloseFacultyModal: document.getElementById('btnCloseFacultyModal'),
  btnCancelFacultyModal: document.getElementById('btnCancelFacultyModal'),
  btnSubmitFaculty: document.getElementById('btnSubmitFaculty'),
  formAddFaculty: document.getElementById('formAddFaculty'),
  facEditId: document.getElementById('facEditId'),
  facName: document.getElementById('facName'),
  facDesignation: document.getElementById('facDesignation'),
  facCollege: document.getElementById('facCollege'),
  facDepartment: document.getElementById('facDepartment'),
  facPhone: document.getElementById('facPhone'),
  facEmail: document.getElementById('facEmail'),
  facCity: document.getElementById('facCity'),
  facNotes: document.getElementById('facNotes'),

  // Campaign Faculty Filter Elements
  boxAudienceFaculties: document.getElementById('boxAudienceFaculties'),
  campaignFacultyDept: document.getElementById('campaignFacultyDept'),
  campaignFacultyCollege: document.getElementById('campaignFacultyCollege'),
  campaignFacultyCount: document.getElementById('campaignFacultyCount'),

  // Settings: General
  qrFullContainer: document.getElementById('qrFullContainer'),
  configForm: document.getElementById('configForm'),
  cfgAdminPhone: document.getElementById('cfgAdminPhone'),
  cfgBrochureUrl: document.getElementById('cfgBrochureUrl'),
  btnExportLeads: document.getElementById('btnExportLeads'),
  btnRefresh: document.getElementById('btnRefresh'),

  // Settings: Gemini AI
  aiConfigForm: document.getElementById('aiConfigForm'),
  cfgAiEnabled: document.getElementById('cfgAiEnabled'),
  cfgAiModel: document.getElementById('cfgAiModel'),
  cfgGeminiApiKey: document.getElementById('cfgGeminiApiKey'),
  cfgAiSystemPrompt: document.getElementById('cfgAiSystemPrompt'),
  btnToggleApiKey: document.getElementById('btnToggleApiKey'),
  eyeIcon: document.getElementById('eyeIcon'),
  btnTestAiConnection: document.getElementById('btnTestAiConnection'),
  aiTestStatus: document.getElementById('aiTestStatus'),
  aiTestResultBox: document.getElementById('aiTestResultBox'),
  aiTestReplyText: document.getElementById('aiTestReplyText'),
  aiStatusBadge: document.getElementById('aiStatusBadge'),

  // Settings: Morning Digest
  digestConfigForm: document.getElementById('digestConfigForm'),
  cfgStaffPhone: document.getElementById('cfgStaffPhone'),
  cfgCounselorPhone: document.getElementById('cfgCounselorPhone'),
  cfgDirectorPhone: document.getElementById('cfgDirectorPhone'),
  cfgDigestTime: document.getElementById('cfgDigestTime'),
  cfgDigestEnabled: document.getElementById('cfgDigestEnabled'),
  btnSaveDigestConfig: document.getElementById('btnSaveDigestConfig'),
  btnSendDigestNow: document.getElementById('btnSendDigestNow'),
  digestActionStatus: document.getElementById('digestActionStatus'),
  digestStatusBadge: document.getElementById('digestStatusBadge'),

  // Settings: Google Sheets Live Sync
  googleSheetForm: document.getElementById('googleSheetForm'),
  cfgGoogleSheetUrl: document.getElementById('cfgGoogleSheetUrl'),
  btnSaveSheetConfig: document.getElementById('btnSaveSheetConfig'),
  btnSyncAllToSheet: document.getElementById('btnSyncAllToSheet'),
  sheetSyncStatus: document.getElementById('sheetSyncStatus'),

  // Settings: Brochure Management & Live Chat Brochure Button
  brochureStatusBadge: document.getElementById('brochureStatusBadge'),
  brochureFileName: document.getElementById('brochureFileName'),
  brochureFileSize: document.getElementById('brochureFileSize'),
  brochureLastModified: document.getElementById('brochureLastModified'),
  btnViewBrochure: document.getElementById('btnViewBrochure'),
  formUploadBrochure: document.getElementById('formUploadBrochure'),
  brochureFileInput: document.getElementById('brochureFileInput'),
  btnSelectBrochureFile: document.getElementById('btnSelectBrochureFile'),
  selectedBrochureFileName: document.getElementById('selectedBrochureFileName'),
  btnUploadBrochureSubmit: document.getElementById('btnUploadBrochureSubmit'),
  brochureUploadStatus: document.getElementById('brochureUploadStatus'),
  formTestSendBrochure: document.getElementById('formTestSendBrochure'),
  testBrochurePhone: document.getElementById('testBrochurePhone'),
  btnTestSendBrochure: document.getElementById('btnTestSendBrochure'),
  testBrochureStatus: document.getElementById('testBrochureStatus'),
  btnSendChatBrochure: document.getElementById('btnSendChatBrochure'),

  // WhatsApp Contacts Elements
  statTotalContacts: document.getElementById('statTotalContacts'),
  statSavedContacts: document.getElementById('statSavedContacts'),
  statPhoneContacts: document.getElementById('statPhoneContacts'),
  contactSearchInput: document.getElementById('contactSearchInput'),
  contactFilterSelect: document.getElementById('contactFilterSelect'),
  btnRefreshContacts: document.getElementById('btnRefreshContacts'),
  btnExportContacts: document.getElementById('btnExportContacts'),
  contactsTableBody: document.getElementById('contactsTableBody'),
  contactsPageInfo: document.getElementById('contactsPageInfo'),
  btnContactsPrevPage: document.getElementById('btnContactsPrevPage'),
  btnContactsNextPage: document.getElementById('btnContactsNextPage'),
  boxAudienceContacts: document.getElementById('boxAudienceContacts'),
  campaignContactsCount: document.getElementById('campaignContactsCount'),

  // Network & Desktop Access
  btnNavbarNetworkLink: document.getElementById('btnNavbarNetworkLink'),
  navbarNetworkText: document.getElementById('navbarNetworkText'),
  networkAccessLink: document.getElementById('networkAccessLink'),
  btnCopyNetworkLink: document.getElementById('btnCopyNetworkLink'),
  btnOpenNetworkLink: document.getElementById('btnOpenNetworkLink'),

  // Google Drive Cloud Backup
  googleDriveForm: document.getElementById('googleDriveForm'),
  cfgGoogleDriveUrl: document.getElementById('cfgGoogleDriveUrl'),
  btnSaveGoogleDriveUrl: document.getElementById('btnSaveGoogleDriveUrl'),
  btnOpenGoogleDriveFolder: document.getElementById('btnOpenGoogleDriveFolder'),
  btnTriggerCloudBackup: document.getElementById('btnTriggerCloudBackup'),
  lblLastBackupTime: document.getElementById('lblLastBackupTime'),
  backupActionStatus: document.getElementById('backupActionStatus'),
  gdriveBackupStatusBadge: document.getElementById('gdriveBackupStatusBadge')
};

// ----------------------------------------------------
// INITIALIZATION
// ----------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
  setupEventListeners();
  loadAllData();
});

// ----------------------------------------------------
// TAB NAVIGATION
// ----------------------------------------------------

function setupNavigation() {
  elements.menuItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const tabName = item.getAttribute('data-tab');
      switchTab(tabName);
    });
  });
}

function switchTab(tabName) {
  state.currentTab = tabName;

  elements.menuItems.forEach(i => i.classList.remove('active'));
  elements.tabs.forEach(t => t.classList.remove('active'));

  const activeMenu = document.querySelector(`.menu-item[data-tab="${tabName}"]`);
  const activeTab = document.getElementById(`tab-${tabName}`);

  if (activeMenu) activeMenu.classList.add('active');
  if (activeTab) activeTab.classList.add('active');

  const titles = {
    dashboard: 'Dashboard Overview',
    leads: 'Student Leads Pipeline',
    inbox: 'Live Chat Agent Desk',
    contacts: 'WhatsApp Contacts & Address Book',
    drip: 'Automated Drip Follow-Up Campaigns',
    campaigns: 'Custom Campaigns & Targeted Broadcasts',
    institutions: 'Institutional & College Workshop Portal',
    faculties: 'College Faculty Directory',
    settings: 'Bot Settings & QR Linking'
  };

  elements.currentPageTitle.textContent = titles[tabName] || 'Dashboard';

  if (tabName === 'leads') fetchLeads();
  if (tabName === 'inbox') fetchChats();
  if (tabName === 'contacts') loadContactsData();
  if (tabName === 'drip') loadDripData();
  if (tabName === 'campaigns') loadCampaignsData();
  if (tabName === 'institutions') loadInstitutionsData();
  if (tabName === 'faculties') loadFacultiesData();
  if (tabName === 'settings') {
    fetchNetworkInfo();
    fetchBackupStatus();
  }
}

// ----------------------------------------------------
// DATA FETCHING & API CALLS
// ----------------------------------------------------

async function loadAllData() {
  await fetchBotStatus();
  await fetchStats();
  await fetchTalkToTeamLeads();
  await fetchLeads();
  await fetchChats();
  await fetchConfig();
  await fetchDripStats();
  await fetchCampaigns();
  await fetchInstitutions();
  await fetchFaculties();
  await fetchBrochureDetails();
  await fetchContactsStats();
  await fetchLabVisits();
  await fetchCallInquiries();
  await fetchNetworkInfo();
  await fetchBackupStatus();
}

async function fetchStats() {
  try {
    const res = await fetch('/api/stats');
    const data = await res.json();
    state.stats = data;
    renderStats(data);
  } catch (err) {
    console.error('Failed to fetch stats:', err);
  }
}

function renderStats(stats) {
  if (elements.statTotalLeads) elements.statTotalLeads.textContent = stats.totalLeads || 0;
  if (elements.statNewLeads) elements.statNewLeads.textContent = stats.newLeads || 0;
  if (elements.statInProgress) elements.statInProgress.textContent = stats.inProgressLeads || 0;
  if (elements.statEnrolled) elements.statEnrolled.textContent = stats.enrolledLeads || 0;
  if (elements.statTalkToTeam) elements.statTalkToTeam.textContent = stats.talkToTeam || 0;
  if (elements.dashTalkToTeamCount) elements.dashTalkToTeamCount.textContent = stats.talkToTeam || 0;

  // Breakdown List
  if (stats.categoryBreakdown && stats.categoryBreakdown.length > 0) {
    elements.categoryBreakdownList.innerHTML = stats.categoryBreakdown.map(item => `
      <div class="breakdown-item">
        <span class="breakdown-label">${escapeHtml(item.category)}</span>
        <span class="breakdown-count">${item.count} Leads</span>
      </div>
    `).join('');
  } else {
    elements.categoryBreakdownList.innerHTML = '<p class="empty-state">No category metrics available yet.</p>';
  }
}

async function fetchLeads() {
  try {
    const query = new URLSearchParams({
      status: state.filters.status,
      category: state.filters.category,
      search: state.filters.search
    });

    const res = await fetch('/api/leads?' + query.toString());
    const data = await res.json();
    state.leads = data;
    renderLeads(data);
  } catch (err) {
    console.error('Failed to fetch leads:', err);
  }
}

function renderLeads(leads) {
  if (!leads || leads.length === 0) {
    elements.leadsTableBody.innerHTML = `<tr><td colspan="7" class="empty-state">No leads found. Incoming student messages on WhatsApp will appear here automatically.</td></tr>`;
    return;
  }

  elements.leadsTableBody.innerHTML = leads.map(l => {
    const statusClass = `status-${(l.status || 'new').toLowerCase().replace(/\s+/g, '-')}`;
    return `
      <tr>
        <td><strong>${escapeHtml(l.name)}</strong></td>
        <td>${escapeHtml(l.phone)}</td>
        <td><span class="breakdown-count">${escapeHtml(l.category)}</span></td>
        <td>${escapeHtml(l.qualification || 'Not Specified')}</td>
        <td><span class="status-pill ${statusClass}">${escapeHtml(l.status)}</span></td>
        <td><small>${escapeHtml(l.notes || '—')}</small></td>
        <td>
          <button class="btn btn-secondary btn-sm" onclick="openEditLeadModal(${l.id})">
            <i class="fa-solid fa-pen"></i> Edit
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

// ----------------------------------------------------
// TALK TO TEAM (OPTION 6) CALLBACK DIRECTORY
// ----------------------------------------------------

async function fetchTalkToTeamLeads() {
  try {
    const res = await fetch('/api/leads/talk-to-team');
    const data = await res.json();
    let list = [];
    if (Array.isArray(data)) {
      list = data;
    } else if (data && Array.isArray(data.leads)) {
      list = data.leads;
    }
    state.talkToTeamLeads = list;
    const count = list.length;
    if (elements.statTalkToTeam) elements.statTalkToTeam.textContent = count;
    if (elements.dashTalkToTeamCount) elements.dashTalkToTeamCount.textContent = count;
    renderDashboardTalkToTeamTable();
    renderTalkToTeamModalTable();
  } catch (err) {
    console.error('Failed to fetch talk-to-team leads:', err);
  }
}
window.fetchTalkToTeamLeads = fetchTalkToTeamLeads;

function renderDashboardTalkToTeamTable() {
  if (!elements.dashTalkToTeamTableBody) return;
  const leads = state.talkToTeamLeads || [];
  if (leads.length === 0) {
    elements.dashTalkToTeamTableBody.innerHTML = `
      <tr>
        <td colspan="7" class="empty-state" style="padding: 24px; text-align: center; color: #64748B;">
          <i class="fa-solid fa-phone-slash" style="font-size: 24px; color: #CBD5E1; margin-bottom: 8px; display: block;"></i>
          No student callback requests pending right now. When candidates select Option 6 on WhatsApp, they will appear here instantly.
        </td>
      </tr>
    `;
    return;
  }

  // Display top 8 recent on dashboard
  const displayLeads = leads.slice(0, 8);
  elements.dashTalkToTeamTableBody.innerHTML = displayLeads.map(l => {
    const cleanPhone = String(l.phone || '').replace(/[^0-9]/g, '');
    const dialPhone = cleanPhone.startsWith('91') && cleanPhone.length === 12 ? cleanPhone : (cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone);
    const dateFormatted = (typeof formatChatDisplayTime === 'function' ? formatChatDisplayTime(l.requested_at) : '') || 'Recently';
    const noteText = l.notes || '';

    return `
      <tr>
        <td>
          <div style="display:flex; align-items:center; gap:8px;">
            <div class="avatar" style="width:30px; height:30px; font-size:12px; background:#E11D48; border-radius:50%;">${escapeHtml((l.name || 'S').substring(0, 2).toUpperCase())}</div>
            <strong>${escapeHtml(l.name || 'Student')}</strong>
          </div>
        </td>
        <td>
          <a href="tel:+${dialPhone}" style="color:#0284c7; font-weight:700; text-decoration:none; display:inline-flex; align-items:center; gap:4px;">
            <i class="fa-solid fa-phone" style="font-size:11px; color:#16a34a;"></i> +${dialPhone}
          </a>
        </td>
        <td><small style="color:#64748B;">${dateFormatted}</small></td>
        <td><span class="breakdown-count" style="font-size:11px;">${escapeHtml(l.category || 'General')}</span></td>
        <td>
          <select onchange="updateTalkToTeamLeadStatus(${l.id}, this.value)" style="padding:4px 8px; border-radius:6px; border:1px solid #CBD5E1; font-size:12px; font-weight:600; cursor:pointer; background:#fff;">
            <option value="New" ${(l.status || 'New') === 'New' ? 'selected' : ''}>Pending Call (New)</option>
            <option value="Called" ${l.status === 'Called' ? 'selected' : ''}>Called</option>
            <option value="Connected" ${l.status === 'Connected' ? 'selected' : ''}>Connected</option>
            <option value="In Progress" ${l.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
            <option value="Enrolled" ${l.status === 'Enrolled' ? 'selected' : ''}>Enrolled</option>
            <option value="Not Interested" ${l.status === 'Not Interested' ? 'selected' : ''}>Not Interested</option>
          </select>
        </td>
        <td style="max-width:220px;">
          <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:6px;">
            <div style="font-size:12px; color:#334155; max-height:38px; overflow:hidden; text-overflow:ellipsis; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; line-height:1.3;" title="${escapeHtml(noteText || 'No notes added yet')}">
              ${noteText ? `<i class="fa-solid fa-comment-dots" style="color:#0284c7; margin-right:4px;"></i>${escapeHtml(noteText)}` : `<span style="color:#94A3B8; font-style:italic;">No notes yet</span>`}
            </div>
            <button type="button" class="btn btn-secondary btn-sm" onclick="openCallNoteModal(${l.id})" style="padding:2px 7px; font-size:11px; flex-shrink:0; border:1px solid #CBD5E1;" title="Record what you talked about">
              <i class="fa-solid fa-pen-to-square" style="color:#0284c7;"></i> ${noteText ? 'Edit' : '+ Note'}
            </button>
          </div>
        </td>
        <td style="text-align:center; white-space:nowrap;">
          <a href="tel:+${dialPhone}" class="btn btn-sm btn-primary" style="background:#16a34a; border-color:#16a34a; color:#fff; text-decoration:none; padding:4px 10px; font-weight:700; font-size:12px; margin-right:4px;" title="Call student directly">
            <i class="fa-solid fa-phone"></i> Call Now
          </a>
          <button type="button" class="btn btn-sm btn-secondary" onclick="openChatFromTalkToTeam('${escapeHtml(dialPhone)}')" style="padding:4px 8px; font-size:12px;" title="Open WhatsApp chat">
            <i class="fa-brands fa-whatsapp" style="color:#25D366;"></i> Chat
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function renderTalkToTeamModalTable() {
  if (!elements.talkToTeamTableBody) return;
  let list = state.talkToTeamLeads || [];
  const searchQuery = (state.talkToTeamFilters.search || '').trim().toLowerCase();
  const statusFilter = state.talkToTeamFilters.status || 'All';

  if (searchQuery) {
    list = list.filter(l => {
      const name = String(l.name || '').toLowerCase();
      const phone = String(l.phone || '').toLowerCase();
      const notes = String(l.notes || '').toLowerCase();
      const msg = String(l.latest_message || '').toLowerCase();
      return name.includes(searchQuery) || phone.includes(searchQuery) || notes.includes(searchQuery) || msg.includes(searchQuery);
    });
  }

  if (statusFilter !== 'All') {
    list = list.filter(l => (l.status || 'New').toLowerCase() === statusFilter.toLowerCase());
  }

  if (elements.talkToTeamTotalSummary) {
    elements.talkToTeamTotalSummary.textContent = `Showing ${list.length} of ${(state.talkToTeamLeads || []).length} students who opted to talk to team`;
  }

  if (list.length === 0) {
    elements.talkToTeamTableBody.innerHTML = `
      <tr>
        <td colspan="7" class="empty-state" style="padding: 30px; text-align: center; color: #64748B;">
          No students found matching your filters.
        </td>
      </tr>
    `;
    return;
  }

  elements.talkToTeamTableBody.innerHTML = list.map(l => {
    const cleanPhone = String(l.phone || '').replace(/[^0-9]/g, '');
    const dialPhone = cleanPhone.startsWith('91') && cleanPhone.length === 12 ? cleanPhone : (cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone);
    const dateFormatted = (typeof formatChatDisplayTime === 'function' ? formatChatDisplayTime(l.requested_at) : '') || 'Recently';
    const noteText = l.notes || '';

    return `
      <tr>
        <td>
          <div style="display:flex; align-items:center; gap:8px;">
            <div class="avatar" style="width:32px; height:32px; font-size:12px; background:#E11D48; border-radius:50%;">${escapeHtml((l.name || 'S').substring(0, 2).toUpperCase())}</div>
            <div>
              <strong>${escapeHtml(l.name || 'Student')}</strong>
            </div>
          </div>
        </td>
        <td>
          <a href="tel:+${dialPhone}" style="color:#0284c7; font-weight:700; text-decoration:none; display:inline-flex; align-items:center; gap:6px;">
            <i class="fa-solid fa-phone" style="font-size:12px; color:#16a34a;"></i> +${dialPhone}
          </a>
        </td>
        <td><small style="color:#64748B; font-weight:500;">${dateFormatted}</small></td>
        <td><span class="breakdown-count" style="font-size:11px;">${escapeHtml(l.category || 'General')}</span></td>
        <td>
          <select onchange="updateTalkToTeamLeadStatus(${l.id}, this.value)" style="padding:4px 8px; border-radius:6px; border:1px solid #CBD5E1; font-size:12px; font-weight:600; cursor:pointer; background:#fff;">
            <option value="New" ${(l.status || 'New') === 'New' ? 'selected' : ''}>Pending Call (New)</option>
            <option value="Called" ${l.status === 'Called' ? 'selected' : ''}>Called</option>
            <option value="Connected" ${l.status === 'Connected' ? 'selected' : ''}>Connected</option>
            <option value="In Progress" ${l.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
            <option value="Enrolled" ${l.status === 'Enrolled' ? 'selected' : ''}>Enrolled</option>
            <option value="Not Interested" ${l.status === 'Not Interested' ? 'selected' : ''}>Not Interested</option>
          </select>
        </td>
        <td style="max-width:220px;">
          <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:6px;">
            <div style="font-size:12px; color:#334155; max-height:38px; overflow:hidden; text-overflow:ellipsis; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; line-height:1.3;" title="${escapeHtml(noteText || 'No notes added yet')}">
              ${noteText ? `<i class="fa-solid fa-comment-dots" style="color:#0284c7; margin-right:4px;"></i>${escapeHtml(noteText)}` : `<span style="color:#94A3B8; font-style:italic;">No notes yet</span>`}
            </div>
            <button type="button" class="btn btn-secondary btn-sm" onclick="openCallNoteModal(${l.id})" style="padding:2px 7px; font-size:11px; flex-shrink:0; border:1px solid #CBD5E1;" title="Record what you talked about">
              <i class="fa-solid fa-pen-to-square" style="color:#0284c7;"></i> ${noteText ? 'Edit' : '+ Note'}
            </button>
          </div>
        </td>
        <td style="text-align:center; white-space:nowrap;">
          <a href="tel:+${dialPhone}" class="btn btn-sm btn-primary" style="background:#16a34a; border-color:#16a34a; color:#fff; text-decoration:none; padding:5px 12px; font-weight:700; font-size:12px; margin-right:6px;" title="Click to call student immediately">
            <i class="fa-solid fa-phone"></i> Call Now
          </a>
          <button type="button" class="btn btn-sm btn-secondary" onclick="openChatFromTalkToTeam('${escapeHtml(dialPhone)}')" style="padding:5px 10px; font-size:12px;" title="Open WhatsApp chat desk">
            <i class="fa-brands fa-whatsapp" style="color:#25D366; font-size:13px;"></i> Chat
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

async function updateTalkToTeamLeadStatus(leadId, newStatus) {
  try {
    const res = await fetch(`/api/leads/${leadId}/talk-to-team-status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    const data = await res.json();
    if (data.success) {
      await fetchTalkToTeamLeads();
      await fetchStats();
      await fetchLeads();
    }
  } catch (err) {
    console.error('Failed to update talk-to-team lead status:', err);
  }
}
window.updateTalkToTeamLeadStatus = updateTalkToTeamLeadStatus;

function openTalkToTeamModal() {
  if (elements.modalTalkToTeam) {
    elements.modalTalkToTeam.classList.add('active');
    fetchTalkToTeamLeads();
  }
}
window.openTalkToTeamModal = openTalkToTeamModal;

function closeTalkToTeamModal() {
  if (elements.modalTalkToTeam) {
    elements.modalTalkToTeam.classList.remove('active');
  }
}
window.closeTalkToTeamModal = closeTalkToTeamModal;

function openCallNoteModal(leadId) {
  const lead = (state.talkToTeamLeads || []).find(l => Number(l.id) === Number(leadId));
  if (!lead) return;

  const modal = document.getElementById('modalCallNote');
  if (!modal) return;

  const leadIdInput = document.getElementById('callNoteLeadId');
  if (leadIdInput) leadIdInput.value = lead.id;

  const nameEl = document.getElementById('callNoteStudentName');
  if (nameEl) nameEl.textContent = lead.name || 'Student';

  const cleanPhone = String(lead.phone || '').replace(/[^0-9]/g, '');
  const dialPhone = cleanPhone.startsWith('91') && cleanPhone.length === 12 ? cleanPhone : (cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone);
  const phoneEl = document.getElementById('callNoteStudentPhone');
  if (phoneEl) phoneEl.textContent = dialPhone ? '+' + dialPhone : '';

  const callBtn = document.getElementById('callNoteDirectCallBtn');
  if (callBtn) {
    callBtn.href = dialPhone ? 'tel:+' + dialPhone : '#';
  }

  const chatBtn = document.getElementById('callNoteDirectChatBtn');
  if (chatBtn) {
    chatBtn.onclick = () => {
      closeCallNoteModal();
      openChatFromTalkToTeam(dialPhone);
    };
  }

  const statusSelect = document.getElementById('callNoteStatusSelect');
  if (statusSelect) {
    statusSelect.value = lead.status || 'New';
  }

  const textarea = document.getElementById('callNoteTextarea');
  if (textarea) {
    textarea.value = lead.notes || '';
  }

  const saveStatus = document.getElementById('callNoteSaveStatus');
  if (saveStatus) saveStatus.textContent = '';

  modal.classList.add('active');
  if (textarea) setTimeout(() => textarea.focus(), 100);
}
window.openCallNoteModal = openCallNoteModal;

function closeCallNoteModal() {
  const modal = document.getElementById('modalCallNote');
  if (modal) modal.classList.remove('active');
}
window.closeCallNoteModal = closeCallNoteModal;

function appendCallNoteTag(tagText) {
  const textarea = document.getElementById('callNoteTextarea');
  if (!textarea) return;
  const current = textarea.value.trim();
  const dateStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  const addition = `[${dateStr}] ${tagText}`;
  if (current) {
    textarea.value = `${current}\n${addition}`;
  } else {
    textarea.value = addition;
  }
  textarea.focus();
}
window.appendCallNoteTag = appendCallNoteTag;

async function saveCallNote() {
  const leadId = document.getElementById('callNoteLeadId')?.value;
  const status = document.getElementById('callNoteStatusSelect')?.value || 'New';
  const notes = document.getElementById('callNoteTextarea')?.value || '';
  const saveStatus = document.getElementById('callNoteSaveStatus');
  const saveBtn = document.getElementById('btnSaveCallNote');

  if (!leadId) return;

  if (saveBtn) saveBtn.disabled = true;
  if (saveStatus) saveStatus.textContent = 'Saving note...';

  try {
    const res = await fetch(`/api/leads/${leadId}/talk-to-team-status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, notes })
    });
    const data = await res.json();
    if (data.success) {
      if (saveStatus) saveStatus.textContent = 'Saved successfully!';
      await fetchTalkToTeamLeads();
      await fetchStats();
      await fetchLeads();
      setTimeout(() => {
        closeCallNoteModal();
        if (saveBtn) saveBtn.disabled = false;
        if (saveStatus) saveStatus.textContent = '';
      }, 500);
    } else {
      if (saveStatus) saveStatus.textContent = 'Error saving note';
      if (saveBtn) saveBtn.disabled = false;
    }
  } catch (err) {
    console.error('Failed to save call note:', err);
    if (saveStatus) saveStatus.textContent = 'Network error saving note';
    if (saveBtn) saveBtn.disabled = false;
  }
}
window.saveCallNote = saveCallNote;

function openChatFromTalkToTeam(phone) {
  closeTalkToTeamModal();
  closeCallNoteModal();
  switchTab('inbox');
  const clean = String(phone).replace(/[^0-9]/g, '');
  const target = state.chats.find(c => {
    const cPhone = String(c.phone || '').replace(/[^0-9]/g, '');
    const cJid = String(c.chat_id || '').replace(/[^0-9]/g, '');
    return (clean.length >= 10 && (cPhone.endsWith(clean.slice(-10)) || cJid.endsWith(clean.slice(-10))));
  });
  if (target) {
    selectChat(target.chat_id);
  } else {
    selectChat(`${clean}@s.whatsapp.net`);
  }
}
window.openChatFromTalkToTeam = openChatFromTalkToTeam;

function exportTalkToTeamToExcel() {
  if (typeof XLSX === 'undefined') {
    alert('Excel exporter library is loading. Please try again.');
    return;
  }
  const leads = state.talkToTeamLeads || [];
  if (leads.length === 0) {
    alert('No students found to export.');
    return;
  }
  const exportData = leads.map((l, idx) => {
    const cleanPhone = String(l.phone || '').replace(/[^0-9]/g, '');
    const dialPhone = cleanPhone.startsWith('91') && cleanPhone.length === 12 ? cleanPhone : (cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone);
    return {
      "S.No": idx + 1,
      "Student Name": l.name || 'Student',
      "WhatsApp Phone": dialPhone ? `+${dialPhone}` : '',
      "Option Selected": "Option 6 (Talk to Our Team)",
      "Requested Date/Time": l.requested_at || '',
      "Course Interest": l.category || 'General',
      "Call Status": l.status || 'New',
      "Discussion Notes / What Was Talked": l.notes || '',
      "Latest WhatsApp Message": l.latest_message || ''
    };
  });

  const ws = XLSX.utils.json_to_sheet(exportData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Option6_Talk_To_Team");
  const today = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `Helix_Talk_To_Team_Students_${today}.xlsx`);
}
window.exportTalkToTeamToExcel = exportTalkToTeamToExcel;

function getChatStartTime(chat) {
  if (!chat) return 0;
  const parse = (val) => {
    if (!val) return 0;
    let s = String(val).trim();
    if (/^\d+$/.test(s)) return parseInt(s, 10);
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(s)) s = s.replace(' ', 'T') + 'Z';
    const d = new Date(s);
    return isNaN(d.getTime()) ? 0 : d.getTime();
  };
  const firstMsgT = parse(chat.first_message_time);
  const createdT = parse(chat.created_at);
  if (firstMsgT && createdT) return Math.min(firstMsgT, createdT);
  return firstMsgT || createdT || parse(chat.last_message_time) || 0;
}

function getLatestChatTime(chat) {
  if (!chat) return 0;
  const parse = (val) => {
    if (!val) return 0;
    let s = String(val).trim();
    if (/^\d+$/.test(s)) return parseInt(s, 10);
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(s)) {
      s = s.replace(' ', 'T') + 'Z';
    }
    const d = new Date(s);
    return isNaN(d.getTime()) ? 0 : d.getTime();
  };
  return Math.max(parse(chat.last_message_time), parse(chat.first_message_time), parse(chat.created_at));
}

function formatChatDisplayTime(timestamp) {
  if (!timestamp) return '';
  let str = String(timestamp).trim();
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(str)) {
    str = str.replace(' ', 'T') + 'Z';
  }
  const date = new Date(str);
  if (isNaN(date.getTime())) return '';
  const now = new Date();
  const diffHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

  if (diffHours < 24 && date.getDate() === now.getDate()) {
    return date.toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } else if (diffHours < 48) {
    return 'Yesterday';
  } else {
    return date.toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short'
    });
  }
}

function updateChatFilterCounts() {
  const now = Date.now();
  let countAll = 0;
  let count24h = 0;
  let count48h = 0;
  let countFresh24h = 0;
  let countFresh48h = 0;
  let countUnread = 0;

  (state.chats || []).forEach(c => {
    countAll++;
    const actT = getLatestChatTime(c);
    const startT = getChatStartTime(c);

    const actDiffHours = actT ? (now - actT) / (1000 * 60 * 60) : 9999;
    const startDiffHours = startT ? (now - startT) / (1000 * 60 * 60) : 9999;

    if (actDiffHours <= 24) count24h++;
    if (actDiffHours <= 48) count48h++;
    if (startDiffHours <= 24) countFresh24h++;
    if (startDiffHours <= 48) countFresh48h++;
    if ((c.unread_count || 0) > 0) countUnread++;
  });

  if (elements.countChatsAll) elements.countChatsAll.textContent = countAll;
  if (elements.countChats24h) elements.countChats24h.textContent = count24h;
  if (elements.countChats48h) elements.countChats48h.textContent = count48h;
  if (elements.countChatsFresh) elements.countChatsFresh.textContent = countFresh24h;
  if (elements.countChatsUnread) elements.countChatsUnread.textContent = countUnread;

  // Subfilter counts for currently selected timeframe
  let subAllCount = countAll;
  let subFreshCount = countFresh24h;
  if (state.chatTimeFilter === '24h' || state.chatTimeFilter === 'fresh') {
    subAllCount = count24h;
    subFreshCount = countFresh24h;
  } else if (state.chatTimeFilter === '48h') {
    subAllCount = count48h;
    subFreshCount = countFresh48h;
  }

  if (elements.countSubfilterAll) elements.countSubfilterAll.textContent = subAllCount;
  if (elements.countSubfilterFresh) elements.countSubfilterFresh.textContent = subFreshCount;

  // Update active state on subfilter buttons
  if (elements.btnSubfilterAll && elements.btnSubfilterFresh) {
    if (state.chatFreshOnly || state.chatTimeFilter === 'fresh') {
      elements.btnSubfilterAll.classList.remove('active');
      elements.btnSubfilterFresh.classList.add('active');
    } else {
      elements.btnSubfilterAll.classList.add('active');
      elements.btnSubfilterFresh.classList.remove('active');
    }
  }

  if (elements.unreadBadge) {
    if (countUnread > 0) {
      elements.unreadBadge.style.display = 'inline-block';
      elements.unreadBadge.textContent = countUnread;
    } else {
      elements.unreadBadge.style.display = 'none';
    }
  }
}

let chatContactSearchTimer = null;
let lastMatchingContacts = [];

function filterAndRenderChats() {
  const now = Date.now();
  const query = (state.chatSearchQuery || '').trim().toLowerCase();
  const filter = state.chatTimeFilter || 'all';
  const isFreshOnly = state.chatFreshOnly || filter === 'fresh';

  const filtered = (state.chats || []).filter(c => {
    const actT = getLatestChatTime(c);
    const startT = getChatStartTime(c);
    const actDiffHours = actT ? (now - actT) / (1000 * 60 * 60) : 9999;
    const startDiffHours = startT ? (now - startT) / (1000 * 60 * 60) : 9999;

    // 1. Time / status / fresh filter
    if (filter === '24h' || filter === 'fresh') {
      if (isFreshOnly) {
        if (startDiffHours > 24) return false;
      } else {
        if (actDiffHours > 24) return false;
      }
    } else if (filter === '48h') {
      if (isFreshOnly) {
        if (startDiffHours > 48) return false;
      } else {
        if (actDiffHours > 48) return false;
      }
    } else if (filter === 'unread') {
      if (!c.unread_count || c.unread_count <= 0) return false;
      if (isFreshOnly && startDiffHours > 48) return false;
    } else {
      // filter === 'all'
      if (isFreshOnly) {
        if (startDiffHours > 48) return false;
      }
    }

    // 2. Search query filter
    if (query) {
      const name = (c.name || '').toLowerCase();
      const phone = (c.phone || '').toLowerCase();
      const lastMsg = (c.last_message || '').toLowerCase();
      if (!name.includes(query) && !phone.includes(query) && !lastMsg.includes(query)) {
        return false;
      }
    }

    return true;
  });

  renderChats(filtered, lastMatchingContacts);

  // If searching by text (at least 2 chars), search address book contacts asynchronously
  if (query && query.length >= 2) {
    clearTimeout(chatContactSearchTimer);
    chatContactSearchTimer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/contacts?limit=15&search=${encodeURIComponent(query)}`);
        const data = await res.json();
        const contacts = data.contacts || [];
        const existingPhones = new Set((filtered || []).map(c => (c.phone || '').replace(/[^0-9]/g, '')));
        const existingJids = new Set((filtered || []).map(c => c.chat_id));
        lastMatchingContacts = contacts.filter(c => {
          const cPhone = (c.phone || '').replace(/[^0-9]/g, '');
          if (cPhone && existingPhones.has(cPhone)) return false;
          if (existingJids.has(c.jid)) return false;
          return true;
        });
        renderChats(filtered, lastMatchingContacts);
      } catch (err) {
        console.error('Error searching contacts for sidebar:', err);
      }
    }, 250);
  } else {
    lastMatchingContacts = [];
  }
}

function setChatTimeFilter(filterName) {
  state.chatTimeFilter = filterName;
  if (filterName === 'fresh') {
    state.chatFreshOnly = true;
  }
  const pills = document.querySelectorAll('.chat-filter-pill');
  pills.forEach(pill => {
    if (pill.getAttribute('data-filter') === filterName) {
      pill.classList.add('active');
    } else {
      pill.classList.remove('active');
    }
  });
  updateChatFilterCounts();
  filterAndRenderChats();
}
window.setChatTimeFilter = setChatTimeFilter;

function setChatFreshMode(isFreshOnly) {
  state.chatFreshOnly = isFreshOnly;
  if (state.chatTimeFilter === 'fresh' && !isFreshOnly) {
    state.chatTimeFilter = '24h';
    const pills = document.querySelectorAll('.chat-filter-pill');
    pills.forEach(pill => {
      if (pill.getAttribute('data-filter') === '24h') pill.classList.add('active');
      else pill.classList.remove('active');
    });
  }
  updateChatFilterCounts();
  filterAndRenderChats();
}
window.setChatFreshMode = setChatFreshMode;

async function fetchChats() {
  try {
    const res = await fetch('/api/chats');
    const data = await res.json();
    state.chats = Array.isArray(data) ? data : [];
    updateChatFilterCounts();
    filterAndRenderChats();
    renderDashboardRecentFeed(state.chats);
  } catch (err) {
    console.error('Failed to fetch chats:', err);
  }
}
window.fetchChats = fetchChats;

function renderDashboardRecentFeed(chats) {
  const container = document.getElementById('recentWhatsAppFeed');
  if (!container) return;
  if (!chats || chats.length === 0) {
    container.innerHTML = `
      <div style="padding: 24px; text-align: center; color: #64748B;">
        <i class="fa-solid fa-comments" style="font-size: 24px; color: #94A3B8; margin-bottom: 8px; display: block;"></i>
        <p style="font-size: 13px;">No active WhatsApp conversations yet.</p>
      </div>
    `;
    return;
  }

  const topRecent = chats.slice(0, 6);
  container.innerHTML = topRecent.map(c => {
    const name = escapeHtml(c.name || 'Candidate Inquiry');
    const phone = escapeHtml(c.phone ? '+' + String(c.phone).replace(/[^0-9]/g, '') : '');
    const msg = escapeHtml(c.last_message || 'Inquiry registered on WhatsApp');
    const timeStr = formatChatDisplayTime(c.last_message_time || c.created_at);
    const initials = (name.replace(/[^a-zA-Z]/g, '') || 'ST').substring(0, 2).toUpperCase();

    return `
      <div class="clinical-stream-item" onclick="openChatAndSwitchTab('${escapeHtml(c.chat_id)}')" style="cursor:pointer;" title="Click to open this conversation in Live Chat">
        <div class="clinical-stream-icon">${initials}</div>
        <div class="clinical-stream-body">
          <div class="clinical-stream-meta">
            <span class="clinical-stream-name">${name} <span style="font-size:11px; font-weight:normal; color:#64748b;">(${phone})</span></span>
            <span class="clinical-stream-time">${timeStr}</span>
          </div>
          <div class="clinical-stream-msg">${msg}</div>
          <div style="margin-top:4px; display:flex; gap:6px; align-items:center;">
            <span class="clinical-tag-ai"><i class="fa-solid fa-robot"></i> AI Counselor Responded</span>
            <span style="font-size:10.5px; color:#64748b;"><i class="fa-solid fa-file-pdf" style="color:#ef4444;"></i> Brochure Available</span>
          </div>
        </div>
      </div>
    `;
  }).join('');
}
window.renderDashboardRecentFeed = renderDashboardRecentFeed;

function openChatAndSwitchTab(chatId) {
  if (typeof switchTab === 'function') switchTab('inbox');
  if (typeof selectChat === 'function') selectChat(chatId);
}
window.openChatAndSwitchTab = openChatAndSwitchTab;

function renderChats(chats, matchingContacts = []) {
  if (!elements.chatThreadsList) return;

  const hasChats = chats && chats.length > 0;
  const hasContacts = matchingContacts && matchingContacts.length > 0;

  if (!hasChats && !hasContacts) {
    let emptyMsg = 'No active WhatsApp conversations yet.';
    const isFresh = state.chatFreshOnly || state.chatTimeFilter === 'fresh';
    if (state.chatSearchQuery) {
      emptyMsg = `No inquiries or contacts matching "${escapeHtml(state.chatSearchQuery)}"`;
    } else if (state.chatTimeFilter === '24h' || state.chatTimeFilter === 'fresh') {
      emptyMsg = isFresh
        ? 'No fresh brand-new inquiries started in the last 24 hours.'
        : 'No inquiries active in the last 24 hours.';
    } else if (state.chatTimeFilter === '48h') {
      emptyMsg = isFresh
        ? 'No fresh brand-new inquiries started in the last 48 hours.'
        : 'No inquiries active in the last 48 hours.';
    } else if (state.chatTimeFilter === 'unread') {
      emptyMsg = 'No unread inquiries.';
    }
    elements.chatThreadsList.innerHTML = `
      <div style="padding: 36px 16px; text-align: center; color: #6B7280;">
        <i class="fa-solid fa-sparkles" style="font-size: 26px; color: #F59E0B; margin-bottom: 8px; display: block;"></i>
        <p style="font-size: 13px; font-weight: 500;">${emptyMsg}</p>
        ${state.chatSearchQuery ? `
          <button class="btn btn-secondary btn-sm" onclick="openNewChatModal()" style="margin-top: 12px; font-size: 12px;">
            <i class="fa-solid fa-address-book" style="color: #25D366;"></i> Browse 3,100+ Contacts
          </button>
        ` : ''}
      </div>
    `;
    return;
  }

  const now = Date.now();
  let html = '';

  if (hasChats) {
    html += chats.map(c => {
      const isSelected = state.selectedChatId === c.chat_id;
      const initials = (c.name || 'Student').substring(0, 2).toUpperCase();
      const timeStr = formatChatDisplayTime(c.last_message_time || c.created_at);

      const actT = getLatestChatTime(c);
      const startT = getChatStartTime(c);
      const actDiffHours = actT ? (now - actT) / (1000 * 60 * 60) : 9999;
      const startDiffHours = startT ? (now - startT) / (1000 * 60 * 60) : 9999;

      let timeTag = '';
      if (startDiffHours <= 24) {
        timeTag = '<span class="inquiry-tag tag-fresh-24h" title="Fresh inquiry started today (last 24h)"><i class="fa-solid fa-sparkles" style="font-size:8px; color:#059669;"></i> Fresh 24h</span>';
      } else if (startDiffHours <= 48) {
        timeTag = '<span class="inquiry-tag tag-fresh-48h" title="Fresh inquiry started yesterday (last 48h)"><i class="fa-solid fa-sparkles" style="font-size:8px; color:#2563EB;"></i> Fresh 48h</span>';
      } else if (actDiffHours <= 24) {
        timeTag = '<span class="inquiry-tag tag-active" title="Existing candidate active in last 24h">Active</span>';
      }

      return `
        <div class="chat-thread-item ${isSelected ? 'active' : ''}" onclick="selectChat('${encodeURIComponent(c.chat_id)}')">
          <div class="avatar">${initials}</div>
          <div class="thread-details">
            <div class="thread-header">
              <span class="thread-name" title="${escapeHtml(c.name || c.phone)}">${escapeHtml(c.name || c.phone)}</span>
              <div class="thread-time-wrap">
                ${timeTag}
                <span class="thread-time">${timeStr}</span>
              </div>
            </div>
            <div class="thread-snippet">${escapeHtml(c.last_message || '')}</div>
          </div>
          ${c.unread_count > 0 ? `<span class="badge">${c.unread_count}</span>` : ''}
        </div>
      `;
    }).join('');
  }

  if (hasContacts) {
    html += `
      <div style="padding: 10px 14px 6px; font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; background: #F8FAFC; border-top: 1px solid #E2E8F0; border-bottom: 1px solid #E2E8F0; display: flex; align-items: center; justify-content: space-between;">
        <span><i class="fa-solid fa-address-book" style="color: #25D366; margin-right: 5px;"></i> WhatsApp Contacts (${matchingContacts.length})</span>
        <span style="font-size: 10px; font-weight: normal; color: #94A3B8;">Click to message</span>
      </div>
    `;
    html += matchingContacts.map(c => {
      const displayName = c.name || c.notify_name || (c.phone ? `+${c.phone}` : 'Contact');
      const initials = (displayName || 'WA').substring(0, 2).toUpperCase();
      const phoneDisplay = c.phone ? `+${c.phone}` : c.jid.replace('@s.whatsapp.net', '');
      return `
        <div class="chat-thread-item" onclick="openChatWithContact('${escapeHtml(c.jid)}', '${escapeHtml(displayName)}', '${escapeHtml(c.phone || '')}')" style="background: #FAFAFA;">
          <div class="avatar" style="background: #25D366; color: white;">${initials}</div>
          <div class="thread-details">
            <div class="thread-header">
              <span class="thread-name" title="${escapeHtml(displayName)}">${escapeHtml(displayName)}</span>
              <span class="thread-time" style="color:#059669; font-weight:600;"><i class="fa-solid fa-paper-plane" style="font-size:10px;"></i> Start</span>
            </div>
            <div class="thread-snippet" style="color:#64748B;">${escapeHtml(phoneDisplay)}</div>
          </div>
        </div>
      `;
    }).join('');
  }

  elements.chatThreadsList.innerHTML = html;
}

async function selectChat(encodedChatId) {
  const chatId = decodeURIComponent(encodedChatId);
  state.selectedChatId = chatId;

  const chat = state.chats.find(c => c.chat_id === chatId);
  if (!chat) return;

  // Clear unread count locally for instant UI update
  if (chat.unread_count > 0) {
    chat.unread_count = 0;
    updateChatFilterCounts();
  }

  if (elements.noChatSelected) elements.noChatSelected.style.display = 'none';
  if (elements.chatActiveView) elements.chatActiveView.style.display = 'flex';

  if (elements.chatAvatar) elements.chatAvatar.textContent = (chat.name || 'ST').substring(0, 2).toUpperCase();
  if (elements.chatHeaderName) elements.chatHeaderName.textContent = chat.name || chat.phone;
  if (elements.chatHeaderPhone) elements.chatHeaderPhone.textContent = '+' + chat.phone;
  if (elements.toggleAutoReply) elements.toggleAutoReply.checked = chat.auto_reply_enabled === 1;

  if (elements.chatHeaderTime) {
    const startT = getChatStartTime(chat);
    const actT = chat.last_message_time || chat.created_at;
    const now = Date.now();
    const startHours = startT ? (now - startT) / (1000 * 60 * 60) : 9999;

    let statusText = '';
    if (startHours <= 24) {
      statusText = '✨ Fresh inquiry started today (' + formatIndianDateTime(startT) + ')';
    } else if (startHours <= 48) {
      statusText = '✨ Fresh inquiry started yesterday (' + formatIndianDateTime(startT) + ')';
    } else {
      statusText = 'Ongoing candidate (Started: ' + formatIndianDate(startT) + ' | Last active: ' + formatIndianDateTime(actT) + ')';
    }
    elements.chatHeaderTime.textContent = statusText;
  }

  // Update active state in threads list
  filterAndRenderChats();
  await fetchMessages(chatId);
}
window.selectChat = selectChat;

async function fetchMessages(chatId) {
  try {
    const res = await fetch(`/api/chats/${encodeURIComponent(chatId)}/messages`);
    const messages = await res.json();
    renderMessages(messages);
  } catch (err) {
    console.error('Failed to fetch messages:', err);
  }
}

function renderMessages(messages) {
  elements.chatMessagesBody.innerHTML = messages.map(m => {
    const isCustomer = m.sender_type === 'customer';
    const bubbleClass = isCustomer ? 'msg-incoming' : 'msg-outgoing';
    const timeStr = formatIndianTime(m.timestamp);

    return `
      <div class="msg-bubble ${bubbleClass}">
        <div class="msg-sender">${escapeHtml(m.sender_name)}</div>
        <div>${escapeHtml(m.text).replace(/\n/g, '<br>')}</div>
        <div class="msg-meta">
          <span>${timeStr}</span>
          ${m.sender_type === 'agent' ? '<i class="fa-solid fa-user-check"></i>' : ''}
          ${m.sender_type === 'bot' ? '<i class="fa-solid fa-robot"></i>' : ''}
        </div>
      </div>
    `;
  }).join('');

  // Scroll to bottom
  elements.chatMessagesBody.scrollTop = elements.chatMessagesBody.scrollHeight;
}

let currentChatAttachment = null;

function handleChatFileSelect(e) {
  const file = e.target.files?.[0];
  if (!file) return;

  if (file.size > 25 * 1024 * 1024) {
    alert('File size exceeds 25MB limit. Please select a smaller file.');
    removeChatAttachment();
    return;
  }

  const reader = new FileReader();
  reader.onload = (loadEvt) => {
    currentChatAttachment = {
      data: loadEvt.target.result,
      fileName: file.name,
      mimetype: file.type || 'application/octet-stream',
      size: file.size
    };

    if (elements.chatAttachmentName) elements.chatAttachmentName.textContent = file.name;
    if (elements.chatAttachmentSize) elements.chatAttachmentSize.textContent = formatBytes(file.size);
    if (elements.chatAttachmentPreview) elements.chatAttachmentPreview.style.display = 'flex';
    if (elements.btnAttachChatFile) elements.btnAttachChatFile.classList.add('has-file');
  };
  reader.readAsDataURL(file);
}

function removeChatAttachment() {
  currentChatAttachment = null;
  if (elements.chatFileInput) elements.chatFileInput.value = '';
  if (elements.chatAttachmentPreview) elements.chatAttachmentPreview.style.display = 'none';
  if (elements.btnAttachChatFile) elements.btnAttachChatFile.classList.remove('has-file');
}

async function sendManualMessage() {
  const text = elements.chatInput.value.trim();
  if (!text && !currentChatAttachment) return;
  if (!state.selectedChatId) return;

  const originalBtnHtml = elements.btnSendMessage.innerHTML;
  elements.btnSendMessage.disabled = true;
  elements.btnSendMessage.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i>';

  try {
    const payload = {
      text: text,
      agentName: 'CRM Agent',
      attachment: currentChatAttachment
    };

    const res = await fetch(`/api/chats/${encodeURIComponent(state.selectedChatId)}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      elements.chatInput.value = '';
      removeChatAttachment();
      await fetchMessages(state.selectedChatId);
      await fetchChats();
    } else {
      const err = await res.json();
      alert('Failed to send message: ' + (err.error || 'Unknown error'));
    }
  } catch (err) {
    alert('Error sending message: ' + err.message);
  } finally {
    elements.btnSendMessage.disabled = false;
    elements.btnSendMessage.innerHTML = originalBtnHtml;
  }
}

// ----------------------------------------------------
// NEW CHAT FROM CONTACTS MODAL
// ----------------------------------------------------

let newChatSearchTimer = null;

async function loadNewChatContacts(search = '') {
  if (!elements.newChatContactsList) return;
  elements.newChatContactsList.innerHTML = `
    <div style="padding: 28px; text-align: center; color: #94A3B8;">
      <i class="fa-solid fa-circle-notch fa-spin" style="font-size: 22px; margin-bottom: 8px; display: block; color: #25D366;"></i>
      Searching 3,100+ WhatsApp contacts...
    </div>
  `;
  try {
    const res = await fetch(`/api/contacts?limit=50&search=${encodeURIComponent(search)}`);
    const data = await res.json();
    const contacts = data.contacts || [];

    if (contacts.length === 0) {
      elements.newChatContactsList.innerHTML = `
        <div style="padding: 32px 16px; text-align: center; color: #64748B;">
          <i class="fa-solid fa-user-slash" style="font-size: 26px; color: #CBD5E1; margin-bottom: 8px; display: block;"></i>
          No contacts found matching "${escapeHtml(search)}".
        </div>
      `;
      return;
    }

    elements.newChatContactsList.innerHTML = contacts.map(c => {
      const displayName = c.name || c.notify_name || (c.phone ? `+${c.phone}` : 'Contact');
      const initials = (displayName || 'WA').substring(0, 2).toUpperCase();
      const phoneDisplay = c.phone ? `+${c.phone}` : c.jid.replace('@s.whatsapp.net', '');
      const isSaved = c.is_saved === 1;

      return `
        <div class="new-chat-contact-row" onclick="startChatFromModal('${escapeHtml(c.jid)}', '${escapeHtml(displayName)}', '${escapeHtml(c.phone || '')}')" style="display:flex; align-items:center; gap:12px; padding:10px 14px; border-bottom:1px solid #F1F5F9; cursor:pointer; transition:background 0.15s ease;" onmouseover="this.style.background='#F8FAFC'" onmouseout="this.style.background='transparent'">
          <div style="width:38px; height:38px; border-radius:50%; background:#DCFCE7; color:#166534; font-weight:600; display:flex; align-items:center; justify-content:center; flex-shrink:0; font-size:13px;">
            ${initials}
          </div>
          <div style="flex:1; min-width:0;">
            <div style="display:flex; align-items:center; gap:6px;">
              <span style="font-weight:600; font-size:13px; color:#1E293B; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                ${escapeHtml(displayName)}
              </span>
              ${isSaved ? '<span style="font-size:10px; background:#DCFCE7; color:#166534; padding:1px 6px; border-radius:10px; font-weight:500;">Saved</span>' : ''}
            </div>
            <div style="font-size:12px; color:#64748B; margin-top:2px;">
              ${escapeHtml(phoneDisplay)}
            </div>
          </div>
          <button class="btn btn-primary btn-sm" style="padding:5px 10px; font-size:12px; display:inline-flex; align-items:center; gap:4px; pointer-events:none;">
            <i class="fa-solid fa-message"></i> Chat
          </button>
        </div>
      `;
    }).join('');
  } catch (err) {
    console.error('Error loading contacts for new chat modal:', err);
    elements.newChatContactsList.innerHTML = `<div style="padding: 24px; text-align: center; color: #DC2626;">Failed to load contacts: ${escapeHtml(err.message)}</div>`;
  }
}

function openNewChatModal() {
  if (!elements.modalNewChatFromContacts) return;
  elements.modalNewChatFromContacts.classList.add('active');
  if (elements.newChatContactSearchInput) {
    elements.newChatContactSearchInput.value = '';
    elements.newChatContactSearchInput.focus();
  }
  loadNewChatContacts('');
}
window.openNewChatModal = openNewChatModal;

function closeNewChatModal() {
  if (elements.modalNewChatFromContacts) {
    elements.modalNewChatFromContacts.classList.remove('active');
  }
}
window.closeNewChatModal = closeNewChatModal;

function startChatFromModal(jid, name, phone) {
  closeNewChatModal();
  openChatWithContact(jid, name, phone);
}
window.startChatFromModal = startChatFromModal;

// ----------------------------------------------------
// EDIT LEAD MODAL
// ----------------------------------------------------

window.openEditLeadModal = function(id) {
  const lead = state.leads.find(l => l.id === id);
  if (!lead) return;

  elements.editLeadId.value = lead.id;
  elements.editLeadName.value = lead.name;
  elements.editLeadPhone.value = lead.phone;
  elements.editLeadStatus.value = lead.status || 'New';
  elements.editLeadCategory.value = lead.category || 'General Inquiry';
  elements.editLeadNotes.value = lead.notes || '';

  elements.editLeadModal.classList.add('active');
};

function closeModal() {
  elements.editLeadModal.classList.remove('active');
}

async function saveLead() {
  const id = elements.editLeadId.value;
  const name = elements.editLeadName.value.trim();
  const phone = elements.editLeadPhone.value.trim().replace(/[^0-9]/g, '');
  const status = elements.editLeadStatus.value;
  const category = elements.editLeadCategory.value;
  const notes = elements.editLeadNotes.value;

  try {
    const res = await fetch(`/api/leads/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, category, notes, name, phone })
    });

    if (res.ok) {
      closeModal();
      await fetchLeads();
      await fetchChats();
      await fetchStats();
    }
  } catch (err) {
    alert('Failed to save lead: ' + err.message);
  }
}

// ----------------------------------------------------
// CONFIG & SETTINGS
// ----------------------------------------------------

async function fetchConfig() {
  try {
    const res = await fetch('/api/bot/config');
    const data = await res.json();
    if (data.ADMIN_PHONE && elements.cfgAdminPhone) elements.cfgAdminPhone.value = data.ADMIN_PHONE;
    if (data.BROCHURE_URL && elements.cfgBrochureUrl) elements.cfgBrochureUrl.value = data.BROCHURE_URL;
    if (data.STAFF_PHONE && elements.cfgStaffPhone) elements.cfgStaffPhone.value = data.STAFF_PHONE;
    if (data.COUNSELOR_PHONE && elements.cfgCounselorPhone) elements.cfgCounselorPhone.value = data.COUNSELOR_PHONE;
    if (data.DIRECTOR_PHONE && elements.cfgDirectorPhone) elements.cfgDirectorPhone.value = data.DIRECTOR_PHONE;
    if (data.DIGEST_TIME && elements.cfgDigestTime) {
      elements.cfgDigestTime.value = data.DIGEST_TIME;
      if (elements.digestStatusBadge) elements.digestStatusBadge.textContent = data.DIGEST_TIME + ' IST';
    }
    if (data.DIGEST_ENABLED !== undefined && elements.cfgDigestEnabled) elements.cfgDigestEnabled.value = data.DIGEST_ENABLED;
    if (data.GOOGLE_SHEET_URL && elements.cfgGoogleSheetUrl) elements.cfgGoogleSheetUrl.value = data.GOOGLE_SHEET_URL;
  } catch (err) {
    console.error('Failed to fetch config:', err);
  }
}

async function saveConfig(e) {
  e.preventDefault();
  const ADMIN_PHONE = elements.cfgAdminPhone.value.trim();
  const BROCHURE_URL = elements.cfgBrochureUrl.value.trim();

  try {
    const res = await fetch('/api/bot/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ADMIN_PHONE, BROCHURE_URL })
    });

    if (res.ok) {
      alert('Settings saved successfully!');
    }
  } catch (err) {
    alert('Error saving settings: ' + err.message);
  }
}

// ----------------------------------------------------
// SOCKET.IO REALTIME EVENTS
// ----------------------------------------------------

let qrPollTimer = null;
async function fetchBotStatus() {
  if (qrPollTimer) {
    clearTimeout(qrPollTimer);
    qrPollTimer = null;
  }
  try {
    const res = await fetch('/api/bot/status');
    if (res.ok) {
      const data = await res.json();
      updateBotStatusUI(data);
      if (!data.connected && !data.qrData) {
        qrPollTimer = setTimeout(fetchBotStatus, 2000);
      }
    }
  } catch (err) {
    console.error('Failed to fetch bot status:', err);
    qrPollTimer = setTimeout(fetchBotStatus, 3000);
  }
}

function updateBotStatusUI({ connected, qrData }) {
  state.botStatus = { connected, qrData };

  if (connected) {
    if (qrPollTimer) {
      clearTimeout(qrPollTimer);
      qrPollTimer = null;
    }
    if (elements.statusDot) elements.statusDot.className = 'status-indicator online';
    if (elements.statusText) elements.statusText.textContent = 'WhatsApp Connected';
    if (elements.statusSub) elements.statusSub.textContent = 'Bot Engine Online 24/7';

    const connectedHTML = `
      <div class="qr-connected-box" style="padding: 24px; text-align: center;">
        <i class="fa-solid fa-circle-check" style="font-size: 48px; color: #10B981; margin-bottom: 12px; display: inline-block;"></i>
        <h3 style="margin-bottom: 8px; font-size: 18px; color: #064E3B;">WhatsApp Linked & Connected!</h3>
        <p style="color: var(--text-secondary); margin-bottom: 20px; font-size: 14px;">Your WhatsApp CRM is active and processing enquiries 24/7.</p>
        <button type="button" class="btn btn-outline" id="btnDisconnectWhatsApp" onclick="disconnectWhatsApp()" style="color: #DC2626; border-color: #DC2626; padding: 10px 20px; font-weight: 600; cursor: pointer; border-radius: 8px;">
          <i class="fa-solid fa-link-slash"></i> Disconnect & Generate New Barcode
        </button>
      </div>
    `;
    if (elements.qrWidgetContainer) elements.qrWidgetContainer.innerHTML = connectedHTML;
    if (elements.qrFullContainer) elements.qrFullContainer.innerHTML = connectedHTML;
  } else if (qrData) {
    if (qrPollTimer) {
      clearTimeout(qrPollTimer);
      qrPollTimer = null;
    }
    if (elements.statusDot) elements.statusDot.className = 'status-indicator offline';
    if (elements.statusText) elements.statusText.textContent = 'Scan QR Code';
    if (elements.statusSub) elements.statusSub.textContent = 'WhatsApp Disconnected';

    const qrHTML = `
      <div class="qr-box" style="text-align: center; padding: 20px;">
        <div style="background: #ffffff; padding: 16px; display: inline-block; border-radius: 16px; border: 2px solid #E2E8F0; box-shadow: 0 4px 16px rgba(0,0,0,0.1); margin-bottom: 16px;">
          <img src="${qrData}" alt="WhatsApp QR Barcode" style="max-width: 260px; width: 100%; height: auto; display: block; margin: 0 auto;">
        </div>
        <p style="font-weight: 700; font-size: 16px; color: var(--text-main); margin-bottom: 6px;">Scan this QR barcode with your WhatsApp</p>
        <p style="font-size: 13px; color: var(--text-secondary); max-width: 380px; margin: 0 auto 14px auto;">
          Open WhatsApp on phone &rarr; Settings (or 3 dots) &rarr; Linked Devices &rarr; Link a Device &rarr; Scan this QR barcode
        </p>
        <button type="button" class="btn btn-secondary btn-sm" onclick="fetchBotStatus()" style="font-size: 12px; padding: 6px 12px;">
          <i class="fa-solid fa-rotate"></i> Refresh QR Barcode
        </button>
      </div>
    `;
    if (elements.qrWidgetContainer) elements.qrWidgetContainer.innerHTML = qrHTML;
    if (elements.qrFullContainer) elements.qrFullContainer.innerHTML = qrHTML;
  } else {
    if (elements.statusDot) elements.statusDot.className = 'status-indicator offline';
    if (elements.statusText) elements.statusText.textContent = 'Connecting...';
    if (elements.statusSub) elements.statusSub.textContent = 'Generating QR Barcode';

    const loadingHTML = `
      <div class="qr-placeholder" style="padding: 24px; text-align: center;">
        <i class="fa-solid fa-circle-notch fa-spin" style="font-size: 40px; color: var(--primary); margin-bottom: 12px;"></i>
        <h3 style="margin-bottom: 6px;">Preparing WhatsApp QR Barcode...</h3>
        <p style="color: var(--text-secondary); margin-bottom: 14px;">Initializing WhatsApp connection engine...</p>
        <button type="button" class="btn btn-secondary btn-sm" onclick="fetchBotStatus()" style="font-size: 12px; padding: 6px 12px;">
          <i class="fa-solid fa-rotate"></i> Check Barcode Status
        </button>
      </div>
    `;
    if (elements.qrWidgetContainer) elements.qrWidgetContainer.innerHTML = loadingHTML;
    if (elements.qrFullContainer) elements.qrFullContainer.innerHTML = loadingHTML;
  }
}

socket.on('bot-status', (status) => {
  updateBotStatusUI(status);
});

async function disconnectWhatsApp() {
  if (!confirm('Are you sure you want to disconnect this WhatsApp number and connect a new number?\n\nA new QR barcode will be generated immediately for you to scan.')) {
    return;
  }

  const loadingHTML = `
    <div class="qr-placeholder" style="padding: 24px; text-align: center;">
      <i class="fa-solid fa-circle-notch fa-spin" style="font-size: 40px; color: var(--primary); margin-bottom: 12px;"></i>
      <h3>Disconnecting WhatsApp...</h3>
      <p style="color: var(--text-secondary);">Clearing session and generating new QR barcode...</p>
    </div>
  `;
  if (elements.qrWidgetContainer) elements.qrWidgetContainer.innerHTML = loadingHTML;
  if (elements.qrFullContainer) elements.qrFullContainer.innerHTML = loadingHTML;
  if (elements.statusText) elements.statusText.textContent = 'Disconnecting...';
  if (elements.statusDot) elements.statusDot.className = 'status-indicator offline';

  try {
    const res = await fetch('/api/bot/disconnect', { method: 'POST' });
    const data = await res.json();
    if (!res.ok || !data.success) {
      alert('Failed to disconnect: ' + (data.error || 'Unknown error'));
    }
  } catch (err) {
    alert('Error disconnecting: ' + err.message);
  }
}
window.disconnectWhatsApp = disconnectWhatsApp;

socket.on('new-message', (data) => {
  if (state.selectedChatId === data.chat_id) {
    fetchMessages(state.selectedChatId);
  }
  fetchChats();
  fetchLeads();
  fetchStats();
  fetchTalkToTeamLeads();
});

socket.on('stats-updated', (stats) => {
  renderStats(stats);
});

socket.on('dashboard-stats-updated', () => {
  fetchStats();
  fetchTalkToTeamLeads();
});

socket.on('lead-updated', () => {
  fetchLeads();
  fetchTalkToTeamLeads();
});

socket.on('drip-updated', () => {
  fetchDripStatus();
  fetchDripStats();
  if (state.currentTab === 'drip') {
    fetchDripSubscribers();
    fetchDripLogs();
    fetchDripConsent();
  }
});

socket.on('drip-consent-updated', () => {
  fetchDripConsent();
  fetchDripStatus();
  if (state.currentTab === 'drip') {
    fetchDripSubscribers();
  }
});

socket.on('drip-status-changed', (data) => {
  fetchDripStatus();
  fetchDripStats();
  if (state.currentTab === 'drip') {
    fetchDripSubscribers();
  }
});

socket.on('campaign-progress', (data) => {
  if (elements.campaignProgressBox) {
    if (data.status === 'cancelled') {
      elements.campaignProgressBox.style.display = 'block';
      if (elements.campaignProgressTitle) {
        elements.campaignProgressTitle.textContent = `🛑 Broadcast Stopped (${data.sent || 0} sent, remaining cancelled)`;
        elements.campaignProgressTitle.style.color = '#DC2626';
      }
      if (elements.campaignProgressBar) elements.campaignProgressBar.style.background = '#DC2626';
      if (elements.campaignStatusBadge) elements.campaignStatusBadge.style.display = 'none';
      if (elements.btnEmergencyStopCampaign) elements.btnEmergencyStopCampaign.style.display = 'none';
      if (elements.btnNavbarStopBroadcast) elements.btnNavbarStopBroadcast.style.display = 'none';
      setTimeout(() => {
        if (elements.campaignProgressBox) elements.campaignProgressBox.style.display = 'none';
      }, 4000);
      fetchCampaigns();
      return;
    }

    elements.campaignProgressBox.style.display = 'block';
    if (elements.campaignStatusBadge) elements.campaignStatusBadge.style.display = 'inline-block';
    if (elements.btnEmergencyStopCampaign) elements.btnEmergencyStopCampaign.style.display = 'inline-flex';
    if (elements.btnNavbarStopBroadcast) elements.btnNavbarStopBroadcast.style.display = 'inline-flex';

    const pct = data.total > 0 ? Math.round((data.current / data.total) * 100) : 0;
    if (elements.campaignProgressBar) {
      elements.campaignProgressBar.style.width = pct + '%';
      elements.campaignProgressBar.style.background = '#DC2626';
    }
    if (elements.campaignProgressRatio) elements.campaignProgressRatio.textContent = `${data.current} / ${data.total} sent (${pct}%)`;
    if (elements.campaignProgressTitle) {
      elements.campaignProgressTitle.style.color = '#991B1B';
      if (data.status === 'completed') {
        elements.campaignProgressTitle.textContent = `Broadcast Completed (${data.sent} sent, ${data.failed} failed)`;
      } else if (data.status === 'resting') {
        elements.campaignProgressTitle.textContent = `⏳ Anti-Ban Resting Break (${data.restSeconds || 100}s) — Paused to protect WhatsApp account...`;
      } else {
        elements.campaignProgressTitle.textContent = `Dispatching: ${data.recipient || ''}`;
      }
    }
    if (data.status === 'completed') {
      if (elements.btnEmergencyStopCampaign) elements.btnEmergencyStopCampaign.style.display = 'none';
      if (elements.btnNavbarStopBroadcast) elements.btnNavbarStopBroadcast.style.display = 'none';
      setTimeout(() => {
        if (elements.campaignProgressBox) elements.campaignProgressBox.style.display = 'none';
        if (elements.campaignStatusBadge) elements.campaignStatusBadge.style.display = 'none';
      }, 5000);
      fetchCampaigns();
    }
  }
});

socket.on('campaign-stopped', () => {
  if (elements.campaignProgressTitle) {
    elements.campaignProgressTitle.textContent = '🛑 Broadcast Stopped';
    elements.campaignProgressTitle.style.color = '#DC2626';
  }
  if (elements.campaignStatusBadge) elements.campaignStatusBadge.style.display = 'none';
  if (elements.btnEmergencyStopCampaign) elements.btnEmergencyStopCampaign.style.display = 'none';
  if (elements.btnNavbarStopBroadcast) elements.btnNavbarStopBroadcast.style.display = 'none';
  setTimeout(() => {
    if (elements.campaignProgressBox) elements.campaignProgressBox.style.display = 'none';
  }, 3000);
  fetchCampaigns();
});

socket.on('campaign-updated', () => {
  fetchCampaigns();
});

socket.on('institution-updated', () => {
  fetchInstitutions();
});

socket.on('faculties-updated', () => {
  fetchFaculties();
});

socket.on('contacts-updated', () => {
  fetchContactsStats();
  if (state.currentTab === 'contacts') {
    loadContacts(state.contacts.page);
  }
});

socket.on('leads-updated', () => {
  fetchLeads();
  fetchTalkToTeamLeads();
});

socket.on('chats-updated', () => {
  fetchChats();
});

socket.on('chat-updated', () => {
  fetchChats();
  if (state.selectedChatId) {
    fetchMessages(state.selectedChatId);
  }
});

socket.on('connect', () => {
  console.log('Socket connected to backend');
});

socket.on('disconnect', (reason) => {
  console.warn('Socket disconnected from backend:', reason);
});

socket.on('connect_error', (err) => {
  console.warn('Socket connection error:', err);
});

// ----------------------------------------------------
// EVENT LISTENERS
// ----------------------------------------------------

function setupEventListeners() {
  // Search & Filter Leads
  elements.leadSearchInput.addEventListener('input', (e) => {
    state.filters.search = e.target.value;
    fetchLeads();
  });
  elements.leadStatusFilter.addEventListener('change', (e) => {
    state.filters.status = e.target.value;
    fetchLeads();
  });
  elements.leadCategoryFilter.addEventListener('change', (e) => {
    state.filters.category = e.target.value;
    fetchLeads();
  });

  // Talk to Team (Option 6) Search & Filter
  elements.talkToTeamSearchInput?.addEventListener('input', (e) => {
    state.talkToTeamFilters.search = e.target.value.toLowerCase().trim();
    renderTalkToTeamModalTable();
  });
  elements.talkToTeamStatusFilter?.addEventListener('change', (e) => {
    state.talkToTeamFilters.status = e.target.value;
    renderTalkToTeamModalTable();
  });

  // Modal
  elements.btnCloseModal.addEventListener('click', closeModal);
  elements.btnCancelEdit.addEventListener('click', closeModal);
  elements.btnSaveLead.addEventListener('click', saveLead);

  // Manual Chat Send
  elements.btnSendMessage.addEventListener('click', sendManualMessage);
  elements.chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendManualMessage();
    }
  });

  // Chat Attachment Listeners
  elements.btnAttachChatFile?.addEventListener('click', () => {
    elements.chatFileInput?.click();
  });
  elements.chatFileInput?.addEventListener('change', handleChatFileSelect);
  elements.btnRemoveChatAttachment?.addEventListener('click', removeChatAttachment);

  // Chat Search & Timeframe Filter Pills
  elements.chatSearchInput?.addEventListener('input', (e) => {
    state.chatSearchQuery = e.target.value;
    filterAndRenderChats();
  });

  // Start New Chat from Contacts Modal Listeners
  elements.btnOpenNewChatModal?.addEventListener('click', openNewChatModal);
  elements.btnCloseNewChatModal?.addEventListener('click', closeNewChatModal);
  elements.btnCancelNewChatModal?.addEventListener('click', closeNewChatModal);
  elements.modalNewChatFromContacts?.addEventListener('click', (e) => {
    if (e.target === elements.modalNewChatFromContacts) closeNewChatModal();
  });
  elements.newChatContactSearchInput?.addEventListener('input', (e) => {
    clearTimeout(newChatSearchTimer);
    newChatSearchTimer = setTimeout(() => {
      loadNewChatContacts(e.target.value.trim());
    }, 250);
  });

  const filterPills = document.querySelectorAll('.chat-filter-pill');
  filterPills.forEach(pill => {
    pill.addEventListener('click', () => {
      const f = pill.getAttribute('data-filter') || 'all';
      setChatTimeFilter(f);
    });
  });

  // Inquiry Activity Mode Subfilter Buttons
  elements.btnSubfilterAll?.addEventListener('click', () => {
    setChatFreshMode(false);
  });
  elements.btnSubfilterFresh?.addEventListener('click', () => {
    setChatFreshMode(true);
  });

  // Auto Reply Toggle
  elements.toggleAutoReply.addEventListener('change', async (e) => {
    if (!state.selectedChatId) return;
    const enabled = e.target.checked;
    await fetch(`/api/chats/${encodeURIComponent(state.selectedChatId)}/toggle-bot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled })
    });
    fetchChats();
  });

  // General Config Form
  elements.configForm?.addEventListener('submit', saveGeneralConfig);

  // Gemini AI Config Form
  elements.aiConfigForm?.addEventListener('submit', saveAiConfig);

  // Test AI Connection Button
  elements.btnTestAiConnection?.addEventListener('click', testAiConnection);

  // Show/Hide API Key Toggle
  elements.btnToggleApiKey?.addEventListener('click', () => {
    if (!elements.cfgGeminiApiKey) return;
    const isPassword = elements.cfgGeminiApiKey.type === 'password';
    elements.cfgGeminiApiKey.type = isPassword ? 'text' : 'password';
    if (elements.eyeIcon) {
      elements.eyeIcon.className = isPassword ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye';
    }
  });

  // Export CSV
  elements.btnExportLeads.addEventListener('click', () => {
    window.location.href = '/api/export/leads';
  });

  // Refresh
  elements.btnRefresh.addEventListener('click', () => {
    loadAllData();
  });

  // Edit Chat Phone Number
  document.getElementById('btnEditChatPhone')?.addEventListener('click', async () => {
    if (!state.selectedChatId) return;
    const currentChat = state.chats.find(c => c.chat_id === state.selectedChatId);
    const existingPhone = currentChat ? currentChat.phone : '';
    const newPhone = prompt('Enter real WhatsApp phone number for ' + (currentChat?.name || 'this student') + ' (e.g. 919876543210):', existingPhone.startsWith('2') && existingPhone.length > 13 ? '' : existingPhone);
    if (newPhone !== null && newPhone.trim()) {
      const clean = newPhone.replace(/[^0-9]/g, '');
      const res = await fetch(`/api/chats/${encodeURIComponent(state.selectedChatId)}/contact`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: clean })
      });
      if (res.ok) {
        if (currentChat) currentChat.phone = clean;
        elements.chatHeaderPhone.textContent = '+' + clean;
        await fetchChats();
        await fetchLeads();
      }
    }
  });

  // --- DRIP CAMPAIGN EVENT LISTENERS ---
  // Subnav Switching
  elements.btnSubtabQueue?.addEventListener('click', () => switchDripSubtab('queue'));
  elements.btnSubtabLabVisits?.addEventListener('click', () => switchDripSubtab('labvisits'));
  elements.btnSubtabCallInquiries?.addEventListener('click', () => switchDripSubtab('callinquiries'));
  elements.btnSubtabLogs?.addEventListener('click', () => switchDripSubtab('logs'));
  elements.btnSubtabTemplates?.addEventListener('click', () => switchDripSubtab('templates'));
  elements.btnSubtabStopDrip?.addEventListener('click', () => switchDripSubtab('stopdrip'));
  elements.btnSubtabConsent?.addEventListener('click', () => switchDripSubtab('consent'));
  elements.btnExportInterestedCsv?.addEventListener('click', () => window.open('/api/drip/export-consent?type=interested', '_blank'));
  elements.btnExportNotInterestedCsv?.addEventListener('click', () => window.open('/api/drip/export-consent?type=not_interested', '_blank'));
  elements.btnExportConsentExcelTop?.addEventListener('click', () => window.open('/api/drip/export-consent?type=all', '_blank'));
  elements.searchInterestedInput?.addEventListener('input', () => filterAndRenderInterestedTable());
  elements.searchNotInterestedInput?.addEventListener('input', () => filterAndRenderNotInterestedTable());

  // Master Stop / Resume All Drip Campaigns Listeners
  elements.btnHeaderStopAllDrip?.addEventListener('click', () => {
    if (state.dripEnabled === false) {
      handleResumeAllDripCampaigns();
    } else {
      handleStopAllDripCampaigns();
    }
  });
  elements.btnBannerResumeDrip?.addEventListener('click', handleResumeAllDripCampaigns);
  elements.btnPanelStopAllDrip?.addEventListener('click', handleStopAllDripCampaigns);
  elements.btnPanelResumeAllDrip?.addEventListener('click', handleResumeAllDripCampaigns);
  elements.btnCardStopAll?.addEventListener('click', handleStopAllDripCampaigns);
  elements.btnCardResumeAll?.addEventListener('click', handleResumeAllDripCampaigns);

  // Lab Visits Export & Broadcast Actions
  elements.btnExportLabVisitsExcelTop?.addEventListener('click', exportLabVisitsToExcel);
  elements.btnDownloadLabVisitsExcel?.addEventListener('click', exportLabVisitsToExcel);
  elements.btnDownloadLabVisitsCsv?.addEventListener('click', exportLabVisitsToCsv);
  elements.btnLaunchLabVisitCampaign?.addEventListener('click', startCustomCampaignForLabVisits);
  elements.btnExportLabVisitsFromCampaign?.addEventListener('click', exportLabVisitsToExcel);

  // Lab Visits Search & Filter Listeners
  elements.labVisitsSearchInput?.addEventListener('input', (e) => {
    state.labVisitFilters.search = e.target.value.toLowerCase().trim();
    renderLabVisitsTable();
  });
  elements.labVisitsCourseFilter?.addEventListener('change', (e) => {
    state.labVisitFilters.course = e.target.value;
    renderLabVisitsTable();
  });
  elements.labVisitsStatusFilter?.addEventListener('change', (e) => {
    state.labVisitFilters.status = e.target.value;
    renderLabVisitsTable();
  });

  // Call Inquiries Export & Broadcast Actions
  elements.btnExportCallInquiriesExcelTop?.addEventListener('click', exportCallInquiriesToExcel);
  elements.btnDownloadCallInquiriesExcel?.addEventListener('click', exportCallInquiriesToExcel);
  elements.btnDownloadCallInquiriesCsv?.addEventListener('click', exportCallInquiriesToCsv);
  elements.btnLaunchCallInquiryCampaign?.addEventListener('click', startCustomCampaignForCallInquiries);
  elements.btnExportCallInquiriesFromCampaign?.addEventListener('click', exportCallInquiriesToExcel);

  // Call Inquiries Search & Filter Listeners
  elements.callInquiriesSearchInput?.addEventListener('input', (e) => {
    state.callInquiryFilters.search = e.target.value.toLowerCase().trim();
    renderCallInquiriesTable();
  });
  elements.callInquiriesCourseFilter?.addEventListener('change', (e) => {
    state.callInquiryFilters.course = e.target.value;
    renderCallInquiriesTable();
  });
  elements.callInquiriesStatusFilter?.addEventListener('change', (e) => {
    state.callInquiryFilters.status = e.target.value;
    renderCallInquiriesTable();
  });

  // Drip Queue Search & Filters
  elements.dripQueueSearchInput?.addEventListener('input', (e) => {
    state.dripFilters.search = e.target.value.toLowerCase();
    renderDripSubscribers();
  });
  elements.dripQueueStatusFilter?.addEventListener('change', (e) => {
    state.dripFilters.status = e.target.value;
    renderDripSubscribers();
  });
  elements.dripQueueCampaignFilter?.addEventListener('change', (e) => {
    state.dripFilters.campaign = e.target.value;
    renderDripSubscribers();
  });

  // Drip Logs Search
  elements.dripLogsSearchInput?.addEventListener('input', (e) => {
    state.dripLogsSearch = e.target.value.toLowerCase();
    renderDripLogs();
  });

  // Templates Campaign Switcher
  elements.btnToggleTplInquiry?.addEventListener('click', () => toggleDripTemplateCampaign('inquiry'));
  elements.btnToggleTplLabVisit?.addEventListener('click', () => toggleDripTemplateCampaign('lab_visit'));

  // Lab Visit Modal
  elements.btnOpenAddLabVisit?.addEventListener('click', openAddLabVisitModal);
  elements.btnCloseLabVisitModal?.addEventListener('click', closeAddLabVisitModal);
  elements.btnCancelLabVisit?.addEventListener('click', closeAddLabVisitModal);
  elements.btnSubmitLabVisit?.addEventListener('click', submitLabVisit);
  elements.formAddLabVisit?.addEventListener('submit', (e) => {
    e.preventDefault();
    submitLabVisit();
  });

  // Call Inquiry Modal
  elements.btnOpenAddCallInquiry?.addEventListener('click', openAddCallInquiryModal);
  elements.btnCloseCallInquiryModal?.addEventListener('click', closeAddCallInquiryModal);
  elements.btnCancelCallInquiry?.addEventListener('click', closeAddCallInquiryModal);
  elements.btnSubmitCallInquiry?.addEventListener('click', submitCallInquiry);
  elements.formAddCallInquiry?.addEventListener('submit', (e) => {
    e.preventDefault();
    submitCallInquiry();
  });

  // Drip Excel Bulk Import Modal
  elements.btnOpenDripExcelModal?.addEventListener('click', openDripExcelModal);
  elements.btnCloseDripExcelModal?.addEventListener('click', closeDripExcelModal);
  elements.btnCancelDripExcel?.addEventListener('click', closeDripExcelModal);
  elements.btnDownloadDripSampleExcel?.addEventListener('click', downloadDripSampleExcel);
  elements.btnSubmitDripExcelImport?.addEventListener('click', submitDripExcelImport);

  elements.dripExcelNameCol?.addEventListener('change', processDripExcelRows);
  elements.dripExcelPhoneCol?.addEventListener('change', processDripExcelRows);
  elements.dripExcelCourseCol?.addEventListener('change', processDripExcelRows);
  elements.dripExcelNotesCol?.addEventListener('change', processDripExcelRows);

  elements.dripExcelDropzone?.addEventListener('click', (e) => {
    if (e.target.id !== 'dripExcelFileInput') {
      elements.dripExcelFileInput?.click();
    }
  });

  elements.dripExcelFileInput?.addEventListener('change', handleDripExcelFileSelected);

  elements.dripExcelDropzone?.addEventListener('dragover', (e) => {
    e.preventDefault();
    elements.dripExcelDropzone.style.borderColor = '#107C41';
    elements.dripExcelDropzone.style.background = '#f0fdf4';
  });

  elements.dripExcelDropzone?.addEventListener('dragleave', (e) => {
    e.preventDefault();
    elements.dripExcelDropzone.style.borderColor = '#cbd5e1';
    elements.dripExcelDropzone.style.background = '#f8fafc';
  });

  elements.dripExcelDropzone?.addEventListener('drop', (e) => {
    e.preventDefault();
    elements.dripExcelDropzone.style.borderColor = '#cbd5e1';
    elements.dripExcelDropzone.style.background = '#f8fafc';
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleDripExcelFileSelected({ target: { files: e.dataTransfer.files } });
    }
  });

  // Edit Template Modal
  elements.btnCloseEditTemplate?.addEventListener('click', closeEditTemplateModal);
  elements.btnCancelEditTemplate?.addEventListener('click', closeEditTemplateModal);
  elements.btnSaveTemplate?.addEventListener('click', saveDripTemplate);
  elements.formEditTemplate?.addEventListener('submit', (e) => {
    e.preventDefault();
    saveDripTemplate();
  });

  // --- CUSTOM CAMPAIGN LISTENERS ---
  elements.campaignAudienceType?.addEventListener('change', (e) => {
    const val = e.target.value;
    if (elements.boxAudienceCustom) elements.boxAudienceCustom.style.display = val === 'custom' ? 'block' : 'none';
    if (elements.boxAudienceExcel) elements.boxAudienceExcel.style.display = val === 'excel' ? 'block' : 'none';
    if (elements.boxAudienceLabVisits) elements.boxAudienceLabVisits.style.display = val === 'lab_visits' ? 'block' : 'none';
    if (elements.boxAudienceCallInquiries) elements.boxAudienceCallInquiries.style.display = val === 'call_inquiries' ? 'block' : 'none';
    if (elements.boxAudienceLeads) elements.boxAudienceLeads.style.display = val === 'leads' ? 'block' : 'none';
    if (elements.boxAudienceFaculties) elements.boxAudienceFaculties.style.display = val === 'faculties' ? 'block' : 'none';
    if (elements.boxAudienceContacts) elements.boxAudienceContacts.style.display = (val === 'contacts_all' || val === 'contacts_saved') ? 'block' : 'none';

    if (val === 'lab_visits') {
      if (elements.campaignLabVisitsCount) elements.campaignLabVisitsCount.textContent = (state.labVisits || []).length;
    }
    if (val === 'call_inquiries') {
      if (elements.campaignCallInquiriesCount) elements.campaignCallInquiriesCount.textContent = (state.callInquiries || []).length;
    }
    if (val === 'leads') updateLeadAudienceCount();
    if (val === 'faculties') updateFacultyAudienceCount();
    if (val === 'contacts_all') updateContactsAudienceCount(false);
    if (val === 'contacts_saved') updateContactsAudienceCount(true);
    renderDynamicPlaceholders();
  });

  // --- EXCEL CONTACTS UPLOAD LISTENERS ---
  elements.btnBrowseExcelFile?.addEventListener('click', () => {
    elements.campaignExcelFileInput?.click();
  });

  elements.campaignExcelFileInput?.addEventListener('change', handleExcelFileUpload);

  elements.btnRemoveExcelFile?.addEventListener('click', removeExcelFile);

  elements.excelNameColumn?.addEventListener('change', () => {
    state.excelSelectedNameCol = elements.excelNameColumn.value;
    processExcelRows();
  });

  elements.excelPhoneColumn?.addEventListener('change', () => {
    state.excelSelectedPhoneCol = elements.excelPhoneColumn.value;
    processExcelRows();
  });

  elements.btnDownloadSampleExcel?.addEventListener('click', downloadSampleExcelTemplate);

  // --- WHATSAPP CONTACTS LISTENERS ---
  let contactSearchTimeout = null;
  elements.contactSearchInput?.addEventListener('input', (e) => {
    clearTimeout(contactSearchTimeout);
    contactSearchTimeout = setTimeout(() => {
      state.contacts.search = e.target.value.trim();
      state.contacts.page = 1;
      loadContacts(1);
    }, 300);
  });

  elements.contactFilterSelect?.addEventListener('change', (e) => {
    state.contacts.filter = e.target.value;
    state.contacts.page = 1;
    loadContacts(1);
  });

  elements.btnRefreshContacts?.addEventListener('click', () => {
    fetchContactsStats();
    loadContacts(state.contacts.page);
  });

  elements.btnExportContacts?.addEventListener('click', () => {
    window.location.href = '/api/export/contacts';
  });

  elements.btnContactsPrevPage?.addEventListener('click', () => {
    if (state.contacts.page > 1) {
      loadContacts(state.contacts.page - 1);
    }
  });

  elements.btnContactsNextPage?.addEventListener('click', () => {
    const totalPages = Math.ceil(state.contacts.total / state.contacts.limit) || 1;
    if (state.contacts.page < totalPages) {
      loadContacts(state.contacts.page + 1);
    }
  });

  elements.campaignLeadCategory?.addEventListener('change', updateLeadAudienceCount);
  elements.campaignLeadStatus?.addEventListener('change', updateLeadAudienceCount);

  elements.campaignFacultyDept?.addEventListener('change', updateFacultyAudienceCount);
  elements.campaignFacultyCollege?.addEventListener('input', updateFacultyAudienceCount);

  elements.btnBrowseFile?.addEventListener('click', () => {
    elements.campaignFileInput?.click();
  });

  elements.campaignFileInput?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    handleCampaignFileUpload(file);
  });

  elements.btnRemoveAttachment?.addEventListener('click', () => {
    if (elements.campaignFileInput) elements.campaignFileInput.value = '';
    handleCampaignFileUpload(null);
  });

  elements.formCreateCampaign?.addEventListener('submit', submitCustomCampaign);
  elements.btnStopCampaign?.addEventListener('click', stopRunningCampaign);
  elements.btnEmergencyStopCampaign?.addEventListener('click', stopRunningCampaign);
  elements.btnNavbarStopBroadcast?.addEventListener('click', stopRunningCampaign);
  elements.btnCloseCampaignLogsModal?.addEventListener('click', closeCampaignLogsModal);
  elements.btnCloseCampaignLogs?.addEventListener('click', closeCampaignLogsModal);

  // --- INSTITUTIONAL WORKSHOP LISTENERS ---
  elements.btnOpenAddInstitution?.addEventListener('click', openAddInstitutionModal);
  elements.btnCloseInstModal?.addEventListener('click', closeAddInstitutionModal);
  elements.btnCancelInstModal?.addEventListener('click', closeAddInstitutionModal);
  elements.formAddInstitution?.addEventListener('submit', submitInstitution);

  elements.instSearchInput?.addEventListener('input', () => {
    renderInstitutions(state.institutions);
  });
  elements.instStatusFilter?.addEventListener('change', () => {
    renderInstitutions(state.institutions);
  });

  // --- COLLEGE FACULTY DIRECTORY LISTENERS ---
  elements.btnOpenAddFaculty?.addEventListener('click', () => openAddFacultyModal());
  elements.btnCloseFacultyModal?.addEventListener('click', () => closeAddFacultyModal());
  elements.btnCancelFacultyModal?.addEventListener('click', () => closeAddFacultyModal());
  elements.formAddFaculty?.addEventListener('submit', (e) => saveFaculty(e));
  elements.btnSubmitFaculty?.addEventListener('click', (e) => saveFaculty(e));

  elements.facultySearchInput?.addEventListener('input', () => {
    state.facultyFilters.search = elements.facultySearchInput.value;
    fetchFaculties();
  });
  elements.facultyDeptFilter?.addEventListener('change', () => {
    state.facultyFilters.department = elements.facultyDeptFilter.value;
    fetchFaculties();
  });

  elements.btnExportFacultiesCsv?.addEventListener('click', () => {
    window.location.href = '/api/export/faculties';
  });

  // --- MORNING DIGEST & GOOGLE SHEETS LISTENERS ---
  elements.digestConfigForm?.addEventListener('submit', saveDigestConfig);
  elements.btnSendDigestNow?.addEventListener('click', sendMorningDigestNow);
  elements.googleSheetForm?.addEventListener('submit', saveGoogleSheetConfig);
  elements.btnSyncAllToSheet?.addEventListener('click', syncAllLeadsToGoogleSheet);

  // --- BROCHURE MANAGEMENT & LIVE CHAT LISTENERS ---
  elements.btnSelectBrochureFile?.addEventListener('click', () => {
    elements.brochureFileInput?.click();
  });
  elements.brochureFileInput?.addEventListener('change', handleBrochureFileSelect);
  elements.formUploadBrochure?.addEventListener('submit', handleBrochureUploadSubmit);
  elements.formTestSendBrochure?.addEventListener('submit', handleTestSendBrochure);
  elements.btnSendChatBrochure?.addEventListener('click', handleSendChatBrochure);

  // --- LOCAL NETWORK & GOOGLE DRIVE BACKUP LISTENERS ---
  elements.btnCopyNetworkLink?.addEventListener('click', copyNetworkLink);
  elements.btnNavbarNetworkLink?.addEventListener('click', () => {
    switchTab('settings');
    setTimeout(() => {
      elements.networkAccessLink?.scrollIntoView({ behavior: 'smooth' });
    }, 200);
  });
  elements.googleDriveForm?.addEventListener('submit', handleSaveGoogleDriveUrl);
  elements.btnSaveGoogleDriveUrl?.addEventListener('click', handleSaveGoogleDriveUrl);
  elements.btnTriggerCloudBackup?.addEventListener('click', handleTriggerCloudBackup);
}

// ----------------------------------------------------
// DRIP CAMPAIGN MODULE FUNCTIONS
// ----------------------------------------------------

async function loadDripData() {
  await fetchDripStatus();
  await fetchDripStats();
  await fetchDripSubscribers();
  await fetchLabVisits();
  await fetchCallInquiries();
  await fetchDripConsent();
  await fetchDripLogs();
  await fetchDripTemplates();
}

async function fetchDripStatus() {
  try {
    const res = await fetch('/api/drip/status');
    if (!res.ok) return;
    const data = await res.json();
    state.dripEnabled = data.enabled;
    state.dripStatusData = data;
    renderDripStatus(data);
  } catch (err) {
    console.error('Failed to fetch drip status:', err);
  }
}

function renderDripStatus(data) {
  const isEnabled = data.enabled !== false;

  // 1. Update warning banner visibility
  if (elements.dripStoppedWarningBanner) {
    elements.dripStoppedWarningBanner.style.display = isEnabled ? 'none' : 'flex';
  }

  // 2. Update Header Action Button
  if (elements.btnHeaderStopAllDrip) {
    if (isEnabled) {
      elements.btnHeaderStopAllDrip.style.background = '#DC2626';
      elements.btnHeaderStopAllDrip.style.borderColor = '#DC2626';
      elements.btnHeaderStopAllDrip.innerHTML = '<i class="fa-solid fa-circle-stop"></i> Stop All Drip Campaigns';
      elements.btnHeaderStopAllDrip.title = 'Click to halt and pause all active 6-day drip campaigns';
    } else {
      elements.btnHeaderStopAllDrip.style.background = '#16A34A';
      elements.btnHeaderStopAllDrip.style.borderColor = '#16A34A';
      elements.btnHeaderStopAllDrip.innerHTML = '<i class="fa-solid fa-play"></i> Resume All Drip Campaigns';
      elements.btnHeaderStopAllDrip.title = 'Click to resume all paused drip campaigns';
    }
  }

  // 3. Update Subtab button indicator
  if (elements.btnSubtabStopDrip) {
    if (isEnabled) {
      elements.btnSubtabStopDrip.style.color = '#DC2626';
      elements.btnSubtabStopDrip.innerHTML = '<i class="fa-solid fa-power-off" style="color: #DC2626;"></i> Stop / Master Control';
    } else {
      elements.btnSubtabStopDrip.style.color = '#B91C1C';
      elements.btnSubtabStopDrip.innerHTML = '<i class="fa-solid fa-ban" style="color: #DC2626;"></i> Drip Stopped (Control)';
    }
  }

  // 4. Update Panel Status Card & Buttons
  if (elements.dripControlStatusCard) {
    if (isEnabled) {
      elements.dripControlStatusCard.style.background = 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)';
      elements.dripControlStatusCard.style.borderColor = '#BBF7D0';
      if (elements.dripControlStatusIcon) {
        elements.dripControlStatusIcon.style.background = '#BBF7D0';
        elements.dripControlStatusIcon.style.color = '#15803D';
        elements.dripControlStatusIcon.innerHTML = '<i class="fa-solid fa-circle-play"></i>';
      }
      if (elements.dripControlStatusBadge) {
        elements.dripControlStatusBadge.style.background = '#16A34A';
        elements.dripControlStatusBadge.textContent = 'ACTIVE & RUNNING';
      }
      if (elements.dripControlStatusDesc) {
        elements.dripControlStatusDesc.textContent = 'Automated 6-day follow-up sequences are active. Scheduled messages are processed on time.';
        elements.dripControlStatusDesc.style.color = '#15803D';
      }
      if (elements.btnPanelStopAllDrip) elements.btnPanelStopAllDrip.style.display = 'inline-flex';
      if (elements.btnPanelResumeAllDrip) elements.btnPanelResumeAllDrip.style.display = 'none';
    } else {
      elements.dripControlStatusCard.style.background = 'linear-gradient(135deg, #FEF2F2 0%, #FEE2E2 100%)';
      elements.dripControlStatusCard.style.borderColor = '#FECACA';
      if (elements.dripControlStatusIcon) {
        elements.dripControlStatusIcon.style.background = '#FECACA';
        elements.dripControlStatusIcon.style.color = '#DC2626';
        elements.dripControlStatusIcon.innerHTML = '<i class="fa-solid fa-ban"></i>';
      }
      if (elements.dripControlStatusBadge) {
        elements.dripControlStatusBadge.style.background = '#DC2626';
        elements.dripControlStatusBadge.textContent = 'STOPPED & PAUSED';
      }
      if (elements.dripControlStatusDesc) {
        elements.dripControlStatusDesc.textContent = 'Automated 6-day sequences are currently HALTED. All active subscribers are paused.';
        elements.dripControlStatusDesc.style.color = '#B91C1C';
      }
      if (elements.btnPanelStopAllDrip) elements.btnPanelStopAllDrip.style.display = 'none';
      if (elements.btnPanelResumeAllDrip) elements.btnPanelResumeAllDrip.style.display = 'inline-flex';
    }
  }

  // 5. Update Campaign Breakdown counts
  const counts = data.campaignCounts || [];
  let inqActive = 0, inqPaused = 0;
  let callActive = 0, callPaused = 0;
  let labActive = 0, labPaused = 0;

  counts.forEach(row => {
    if (row.campaign_type === 'inquiry') {
      if (row.status === 'active') inqActive += row.count;
      if (row.status === 'paused') inqPaused += row.count;
    } else if (row.campaign_type === 'call_inquiry') {
      if (row.status === 'active') callActive += row.count;
      if (row.status === 'paused') callPaused += row.count;
    } else if (row.campaign_type === 'lab_visit') {
      if (row.status === 'active') labActive += row.count;
      if (row.status === 'paused') labPaused += row.count;
    }
  });

  if (elements.ctrlInquiryActive) elements.ctrlInquiryActive.textContent = inqActive;
  if (elements.ctrlInquiryPaused) elements.ctrlInquiryPaused.textContent = inqPaused;
  if (elements.ctrlBadgeInquiryStatus) {
    elements.ctrlBadgeInquiryStatus.textContent = isEnabled && inqActive > 0 ? 'Active' : (inqPaused > 0 ? 'Paused' : 'Idle');
    elements.ctrlBadgeInquiryStatus.style.background = isEnabled && inqActive > 0 ? '#25D366' : (inqPaused > 0 ? '#DC2626' : '#94A3B8');
  }

  if (elements.ctrlCallActive) elements.ctrlCallActive.textContent = callActive;
  if (elements.ctrlCallPaused) elements.ctrlCallPaused.textContent = callPaused;
  if (elements.ctrlBadgeCallStatus) {
    elements.ctrlBadgeCallStatus.textContent = isEnabled && callActive > 0 ? 'Active' : (callPaused > 0 ? 'Paused' : 'Idle');
    elements.ctrlBadgeCallStatus.style.background = isEnabled && callActive > 0 ? '#0284C7' : (callPaused > 0 ? '#DC2626' : '#94A3B8');
  }

  if (elements.ctrlLabActive) elements.ctrlLabActive.textContent = labActive;
  if (elements.ctrlLabPaused) elements.ctrlLabPaused.textContent = labPaused;
  if (elements.ctrlBadgeLabStatus) {
    elements.ctrlBadgeLabStatus.textContent = isEnabled && labActive > 0 ? 'Active' : (labPaused > 0 ? 'Paused' : 'Idle');
    elements.ctrlBadgeLabStatus.style.background = isEnabled && labActive > 0 ? '#059669' : (labPaused > 0 ? '#DC2626' : '#94A3B8');
  }
}

async function handleStopAllDripCampaigns() {
  const confirmed = confirm(
    'Are you sure you want to STOP ALL Drip Campaigns?\n\n' +
    '• All active students currently in the 6-day queue will be PAUSED.\n' +
    '• The background follow-up engine will be turned OFF.\n' +
    '• No automated messages will be sent until you click Resume.'
  );
  if (!confirmed) return;

  try {
    const res = await fetch('/api/drip/stop-all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const result = await res.json();
    if (result.success) {
      showToast('All drip campaigns have been stopped successfully. Active students are paused.', 'warning');
      await fetchDripStatus();
      await fetchDripSubscribers();
      await fetchDripStats();
    } else {
      showToast('Error stopping drip campaigns: ' + (result.error || 'Unknown error'), 'error');
    }
  } catch (err) {
    console.error('Stop drip error:', err);
    showToast('Failed to stop drip campaigns: ' + err.message, 'error');
  }
}

async function handleResumeAllDripCampaigns() {
  const confirmed = confirm(
    'Are you sure you want to RESUME ALL Drip Campaigns?\n\n' +
    '• All paused students in the 6-day queue will be set to ACTIVE.\n' +
    '• The automated follow-up engine will turn ON.\n' +
    '• Next messages will be scheduled safely to continue sequences.'
  );
  if (!confirmed) return;

  try {
    const res = await fetch('/api/drip/resume-all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const result = await res.json();
    if (result.success) {
      showToast('All drip campaigns have been resumed successfully.', 'success');
      await fetchDripStatus();
      await fetchDripSubscribers();
      await fetchDripStats();
    } else {
      showToast('Error resuming drip campaigns: ' + (result.error || 'Unknown error'), 'error');
    }
  } catch (err) {
    console.error('Resume drip error:', err);
    showToast('Failed to resume drip campaigns: ' + err.message, 'error');
  }
}

async function fetchDripStats() {
  try {
    const res = await fetch('/api/drip/stats');
    if (!res.ok) return;
    const data = await res.json();
    state.dripStats = data;
    renderDripStats(data);
  } catch (err) {
    console.error('Failed to fetch drip stats:', err);
  }
}

function renderDripStats(stats) {
  if (elements.dripStatActive) elements.dripStatActive.textContent = stats.activeSubscribers ?? stats.active ?? 0;
  if (elements.dripStatToday) elements.dripStatToday.textContent = stats.todaySent ?? stats.sentToday ?? 0;
  if (elements.dripStatTotal) elements.dripStatTotal.textContent = stats.totalSent ?? 0;
  if (elements.dripStatCompleted) elements.dripStatCompleted.textContent = stats.completedSubscribers ?? stats.completed ?? 0;
}

function switchDripSubtab(subtab) {
  state.dripSubtab = subtab;

  // Toggle active subnav button
  elements.btnSubtabQueue?.classList.toggle('active', subtab === 'queue');
  elements.btnSubtabLabVisits?.classList.toggle('active', subtab === 'labvisits');
  elements.btnSubtabCallInquiries?.classList.toggle('active', subtab === 'callinquiries');
  elements.btnSubtabLogs?.classList.toggle('active', subtab === 'logs');
  elements.btnSubtabTemplates?.classList.toggle('active', subtab === 'templates');
  elements.btnSubtabConsent?.classList.toggle('active', subtab === 'consent');
  elements.btnSubtabStopDrip?.classList.toggle('active', subtab === 'stopdrip');

  // Toggle views
  if (elements.viewDripQueue) elements.viewDripQueue.style.display = subtab === 'queue' ? 'block' : 'none';
  if (elements.viewDripLabVisits) elements.viewDripLabVisits.style.display = subtab === 'labvisits' ? 'block' : 'none';
  if (elements.viewDripCallInquiries) elements.viewDripCallInquiries.style.display = subtab === 'callinquiries' ? 'block' : 'none';
  if (elements.viewDripLogs) elements.viewDripLogs.style.display = subtab === 'logs' ? 'block' : 'none';
  if (elements.viewDripTemplates) elements.viewDripTemplates.style.display = subtab === 'templates' ? 'block' : 'none';
  if (elements.viewDripConsent) elements.viewDripConsent.style.display = subtab === 'consent' ? 'block' : 'none';
  if (elements.viewDripStopControls) elements.viewDripStopControls.style.display = subtab === 'stopdrip' ? 'block' : 'none';

  if (subtab === 'queue') fetchDripSubscribers();
  if (subtab === 'labvisits') fetchLabVisits();
  if (subtab === 'callinquiries') fetchCallInquiries();
  if (subtab === 'consent') fetchDripConsent();
  if (subtab === 'logs') fetchDripLogs();
  if (subtab === 'templates') fetchDripTemplates();
  if (subtab === 'stopdrip') fetchDripStatus();
}

async function fetchLabVisits() {
  try {
    const res = await fetch('/api/lab-visits');
    if (!res.ok) return;
    state.labVisits = await res.json();
    const count = (state.labVisits || []).length;
    if (elements.badgeLabVisitCount) elements.badgeLabVisitCount.textContent = count;
    if (elements.badgeLabVisitTotal) elements.badgeLabVisitTotal.textContent = `${count} Students`;
    if (elements.campaignLabVisitsCount) elements.campaignLabVisitsCount.textContent = count;
    renderLabVisitsTable();
  } catch (err) {
    console.error('Failed to fetch lab visits:', err);
    if (elements.labVisitsTableBody) {
      elements.labVisitsTableBody.innerHTML = `<tr><td colspan="8" class="text-center" style="color:#DC2626;">Error loading lab visits: ${escapeHtml(err.message)}</td></tr>`;
    }
  }
}
window.fetchLabVisits = fetchLabVisits;

function renderLabVisitsTable() {
  if (!elements.labVisitsTableBody) return;

  const { search, course, status } = state.labVisitFilters;

  const filtered = (state.labVisits || []).filter(s => {
    if (course !== 'All' && s.category !== course) return false;
    if (status !== 'All' && s.drip_status !== status) return false;
    if (search) {
      const q = search.toLowerCase();
      const nameMatch = (s.name || '').toLowerCase().includes(q);
      const phoneMatch = (s.phone || '').includes(q);
      const courseMatch = (s.category || '').toLowerCase().includes(q);
      const notesMatch = (s.notes || '').toLowerCase().includes(q);
      if (!nameMatch && !phoneMatch && !courseMatch && !notesMatch) return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    elements.labVisitsTableBody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center" style="padding: 32px 16px; color: #64748B;">
          <i class="fa-solid fa-vial-circle-check" style="font-size: 26px; color: #94A3B8; margin-bottom: 8px; display: block;"></i>
          No lab visited students found matching the selected filters.
        </td>
      </tr>
    `;
    return;
  }

  elements.labVisitsTableBody.innerHTML = filtered.map((s, idx) => {
    const displayName = s.name || 'Student';
    const phoneDisplay = s.phone ? `+${s.phone}` : '—';
    const jid = s.chat_id || (s.phone ? `${s.phone}@s.whatsapp.net` : '');
    const cleanNotes = escapeHtml(s.notes || '').replace(/\n/g, '<br>');

    // Drip step indicator
    let dripBadge = '';
    if (s.drip_status === 'completed') {
      dripBadge = '<span class="status-pill status-enrolled"><i class="fa-solid fa-circle-check"></i> Completed (Day 6)</span>';
    } else if (s.drip_status === 'active') {
      dripBadge = `<span class="status-pill status-contacted"><i class="fa-solid fa-paper-plane"></i> Step ${s.current_step || 0}/6 Active</span>`;
    } else if (s.drip_status === 'paused') {
      dripBadge = '<span class="status-pill" style="background:#F1F5F9; color:#64748B;"><i class="fa-solid fa-pause"></i> Paused</span>';
    } else {
      dripBadge = `<span class="status-pill status-new">${escapeHtml(s.drip_status || 'Enrolled')}</span>`;
    }

    return `
      <tr>
        <td><strong>${idx + 1}</strong></td>
        <td>
          <div style="font-weight: 600; color: #1E293B;">${escapeHtml(displayName)}</div>
        </td>
        <td>
          <div style="display: flex; align-items: center; gap: 6px;">
            <code style="font-size: 13px; font-weight: 600; color: #0284C7;">${escapeHtml(phoneDisplay)}</code>
            ${s.phone ? `
              <button class="btn-icon-sm" onclick="navigator.clipboard.writeText('${s.phone}'); alert('Copied +${s.phone} to clipboard');" title="Copy Number">
                <i class="fa-regular fa-copy"></i>
              </button>
            ` : ''}
          </div>
        </td>
        <td>
          <span class="badge-campaign badge-campaign-lab_visit" style="font-size: 11px;">
            <i class="fa-solid fa-graduation-cap"></i> ${escapeHtml(s.category || 'Lab Visit')}
          </span>
        </td>
        <td>
          <div style="font-size: 12px; color: #475569; max-width: 240px; word-break: break-word;">
            ${cleanNotes || '<span style="color:#94A3B8;">Direct Walk-in</span>'}
          </div>
        </td>
        <td>${dripBadge}</td>
        <td>
          <span class="status-pill status-contacted">${escapeHtml(s.lead_status || 'Contacted')}</span>
        </td>
        <td>
          <div style="display: flex; gap: 6px; flex-wrap: wrap;">
            ${jid ? `
              <button class="btn btn-secondary btn-sm" onclick="openChatWithContact('${escapeHtml(jid)}', '${escapeHtml(displayName)}', '${escapeHtml(s.phone || '')}')" title="Open WhatsApp Chat in Agent Desk">
                <i class="fa-solid fa-comment-dots"></i> Chat
              </button>
            ` : ''}
            <button class="btn btn-primary btn-sm" onclick="startCustomCampaignForSingle('${escapeHtml(s.phone || '')}', '${escapeHtml(displayName)}')" title="Launch Custom Broadcast for this student">
              <i class="fa-solid fa-paper-plane"></i> Broadcast
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

async function exportLabVisitsToExcel() {
  try {
    let students = state.labVisits;
    if (!students || students.length === 0) {
      const res = await fetch('/api/lab-visits');
      if (res.ok) students = await res.json();
    }
    if (!students || students.length === 0) {
      alert('No lab visited students available to export.');
      return;
    }

    if (typeof XLSX === 'undefined') {
      window.location.href = '/api/export/lab-visits-csv';
      return;
    }

    const data = students.map((s, idx) => ({
      'S.No': idx + 1,
      'Student Name': s.name || 'Student',
      'WhatsApp Phone Number': s.phone ? `+${s.phone}` : '',
      'Mobile Number (10 Digits)': s.phone ? String(s.phone).slice(-10) : '',
      'Course / Interest': s.category || 'General',
      'Lab Visit Notes': s.notes || '',
      'Lead Status': s.lead_status || 'Contacted',
      'Drip Sequence Status': s.drip_status || 'active',
      'Current Drip Step': s.current_step !== undefined ? `Step ${s.current_step} of 6` : '',
      'Registered Date': s.created_at || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    worksheet['!cols'] = [
      { wch: 6 },
      { wch: 22 },
      { wch: 18 },
      { wch: 16 },
      { wch: 22 },
      { wch: 35 },
      { wch: 14 },
      { wch: 18 },
      { wch: 16 },
      { wch: 20 }
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Lab Visited Students');
    XLSX.writeFile(workbook, 'Helix_Lab_Visited_Students.xlsx');
  } catch (err) {
    console.error('Error generating Excel file:', err);
    window.location.href = '/api/export/lab-visits-csv';
  }
}
window.exportLabVisitsToExcel = exportLabVisitsToExcel;

function exportLabVisitsToCsv() {
  window.location.href = '/api/export/lab-visits-csv';
}
window.exportLabVisitsToCsv = exportLabVisitsToCsv;

function startCustomCampaignForLabVisits() {
  switchTab('campaigns');
  if (elements.campaignAudienceType) {
    elements.campaignAudienceType.value = 'lab_visits';
    elements.campaignAudienceType.dispatchEvent(new Event('change'));
  }
  if (elements.campaignTitle) {
    elements.campaignTitle.value = 'Broadcast to Lab Visited Students - ' + new Date().toLocaleDateString('en-IN');
  }
  if (elements.campaignMessage) {
    elements.campaignMessage.focus();
  }
}
window.startCustomCampaignForLabVisits = startCustomCampaignForLabVisits;

async function fetchCallInquiries() {
  try {
    const res = await fetch('/api/call-inquiries');
    if (!res.ok) return;
    state.callInquiries = await res.json();
    const count = (state.callInquiries || []).length;
    if (elements.badgeCallInquiryCount) elements.badgeCallInquiryCount.textContent = count;
    if (elements.badgeCallInquiryTotal) elements.badgeCallInquiryTotal.textContent = `${count} Students`;
    if (elements.campaignCallInquiriesCount) elements.campaignCallInquiriesCount.textContent = count;
    renderCallInquiriesTable();
  } catch (err) {
    console.error('Failed to fetch call inquiries:', err);
    if (elements.callInquiriesTableBody) {
      elements.callInquiriesTableBody.innerHTML = `<tr><td colspan="8" class="text-center" style="color:#DC2626;">Error loading call inquiries: ${escapeHtml(err.message)}</td></tr>`;
    }
  }
}
window.fetchCallInquiries = fetchCallInquiries;

function renderCallInquiriesTable() {
  if (!elements.callInquiriesTableBody) return;

  const { search, course, status } = state.callInquiryFilters;

  const filtered = (state.callInquiries || []).filter(s => {
    if (course !== 'All' && s.category !== course) return false;
    if (status !== 'All' && s.drip_status !== status) return false;
    if (search) {
      const q = search.toLowerCase();
      const nameMatch = (s.name || '').toLowerCase().includes(q);
      const phoneMatch = (s.phone || '').includes(q);
      const courseMatch = (s.category || '').toLowerCase().includes(q);
      const notesMatch = (s.notes || '').toLowerCase().includes(q);
      if (!nameMatch && !phoneMatch && !courseMatch && !notesMatch) return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    elements.callInquiriesTableBody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center" style="padding: 32px 16px; color: #64748B;">
          <i class="fa-solid fa-phone-slash" style="font-size: 26px; color: #94A3B8; margin-bottom: 8px; display: block;"></i>
          No call inquiry students found matching the selected filters.
        </td>
      </tr>
    `;
    return;
  }

  elements.callInquiriesTableBody.innerHTML = filtered.map((s, idx) => {
    const displayName = s.name || 'Student';
    const phoneDisplay = s.phone ? `+${s.phone}` : '—';
    const jid = s.chat_id || (s.phone ? `${s.phone}@s.whatsapp.net` : '');
    const cleanNotes = escapeHtml(s.notes || '').replace(/\n/g, '<br>');

    // Drip step indicator
    let dripBadge = '';
    if (s.drip_status === 'completed') {
      dripBadge = '<span class="status-pill status-enrolled"><i class="fa-solid fa-circle-check"></i> Completed (Day 6)</span>';
    } else if (s.drip_status === 'active') {
      dripBadge = `<span class="status-pill status-contacted"><i class="fa-solid fa-paper-plane"></i> Step ${s.current_step || 0}/6 Active</span>`;
    } else if (s.drip_status === 'paused') {
      dripBadge = '<span class="status-pill" style="background:#F1F5F9; color:#64748B;"><i class="fa-solid fa-pause"></i> Paused</span>';
    } else {
      dripBadge = `<span class="status-pill status-new">${escapeHtml(s.drip_status || 'Enrolled')}</span>`;
    }

    return `
      <tr>
        <td><strong>${idx + 1}</strong></td>
        <td>
          <div style="font-weight: 600; color: #1E293B;">${escapeHtml(displayName)}</div>
        </td>
        <td>
          <div style="display: flex; align-items: center; gap: 6px;">
            <code style="font-size: 13px; font-weight: 600; color: #0284C7;">${escapeHtml(phoneDisplay)}</code>
            ${s.phone ? `
              <button class="btn-icon-sm" onclick="navigator.clipboard.writeText('${s.phone}'); alert('Copied +${s.phone} to clipboard');" title="Copy Number">
                <i class="fa-regular fa-copy"></i>
              </button>
            ` : ''}
          </div>
        </td>
        <td>
          <span class="badge-campaign badge-campaign-inquiry" style="font-size: 11px; background:#E0F2FE; color:#0369A1;">
            <i class="fa-solid fa-phone-volume"></i> ${escapeHtml(s.category || 'Call Inquiry')}
          </span>
        </td>
        <td>
          <div style="font-size: 12px; color: #475569; max-width: 240px; word-break: break-word;">
            ${cleanNotes || '<span style="color:#94A3B8;">Telephonic Inquiry</span>'}
          </div>
        </td>
        <td>${dripBadge}</td>
        <td>
          <span class="status-pill status-contacted">${escapeHtml(s.lead_status || 'Contacted')}</span>
        </td>
        <td>
          <div style="display: flex; gap: 6px; flex-wrap: wrap;">
            ${jid ? `
              <button class="btn btn-secondary btn-sm" onclick="openChatWithContact('${escapeHtml(jid)}', '${escapeHtml(displayName)}', '${escapeHtml(s.phone || '')}')" title="Open WhatsApp Chat in Agent Desk">
                <i class="fa-solid fa-comment-dots"></i> Chat
              </button>
            ` : ''}
            <button class="btn btn-primary btn-sm" onclick="startCustomCampaignForSingle('${escapeHtml(s.phone || '')}', '${escapeHtml(displayName)}')" title="Launch Custom Broadcast for this student">
              <i class="fa-solid fa-paper-plane"></i> Broadcast
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}
window.renderCallInquiriesTable = renderCallInquiriesTable;

async function exportCallInquiriesToExcel() {
  try {
    let students = state.callInquiries;
    if (!students || students.length === 0) {
      const res = await fetch('/api/call-inquiries');
      if (res.ok) students = await res.json();
    }
    if (!students || students.length === 0) {
      alert('No call inquiry students available to export.');
      return;
    }

    if (typeof XLSX === 'undefined') {
      window.location.href = '/api/export/call-inquiries-csv';
      return;
    }

    const data = students.map((s, idx) => ({
      'S.No': idx + 1,
      'Student Name': s.name || 'Student',
      'WhatsApp Phone Number': s.phone ? `+${s.phone}` : '',
      'Mobile Number (10 Digits)': s.phone ? String(s.phone).slice(-10) : '',
      'Course / Program Inquired': s.category || 'Call Inquiry',
      'Call Notes & Remarks': s.notes || '',
      'Lead Pipeline Status': s.lead_status || 'Contacted',
      'Drip Sequence Status': s.drip_status || 'active',
      'Current Drip Step': s.current_step !== undefined ? `Step ${s.current_step} of 6` : '',
      'Inquiry Date': s.created_at || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    worksheet['!cols'] = [
      { wch: 6 },
      { wch: 22 },
      { wch: 18 },
      { wch: 16 },
      { wch: 24 },
      { wch: 35 },
      { wch: 16 },
      { wch: 18 },
      { wch: 16 },
      { wch: 20 }
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Call Inquiry Students');
    XLSX.writeFile(workbook, 'Helix_Call_Inquiry_Students.xlsx');
  } catch (err) {
    console.error('Error generating Call Inquiries Excel file:', err);
    window.location.href = '/api/export/call-inquiries-csv';
  }
}
window.exportCallInquiriesToExcel = exportCallInquiriesToExcel;

function exportCallInquiriesToCsv() {
  window.location.href = '/api/export/call-inquiries-csv';
}
window.exportCallInquiriesToCsv = exportCallInquiriesToCsv;

function startCustomCampaignForCallInquiries() {
  switchTab('campaigns');
  if (elements.campaignAudienceType) {
    elements.campaignAudienceType.value = 'call_inquiries';
    elements.campaignAudienceType.dispatchEvent(new Event('change'));
  }
  if (elements.campaignTitle) {
    elements.campaignTitle.value = 'Broadcast to Call Inquiry Students - ' + new Date().toLocaleDateString('en-IN');
  }
  if (elements.campaignMessage) {
    elements.campaignMessage.focus();
  }
}
window.startCustomCampaignForCallInquiries = startCustomCampaignForCallInquiries;

function startCustomCampaignForSingle(phone, name) {
  if (!phone) return;
  switchTab('campaigns');
  if (elements.campaignAudienceType) {
    elements.campaignAudienceType.value = 'custom';
    elements.campaignAudienceType.dispatchEvent(new Event('change'));
  }
  if (elements.campaignCustomNumbers) {
    elements.campaignCustomNumbers.value = phone;
  }
  if (elements.campaignTitle) {
    elements.campaignTitle.value = 'Broadcast to ' + (name || phone);
  }
  if (elements.campaignMessage) {
    elements.campaignMessage.focus();
  }
}
window.startCustomCampaignForSingle = startCustomCampaignForSingle;

async function fetchDripSubscribers() {
  try {
    const res = await fetch('/api/drip/subscribers');
    if (!res.ok) return;
    state.dripSubscribers = await res.json();
    renderDripSubscribers();
  } catch (err) {
    console.error('Failed to fetch drip subscribers:', err);
  }
}

function renderDripSubscribers() {
  if (!elements.dripSubscribersTableBody) return;

  const { status, campaign, search } = state.dripFilters;

  const filtered = state.dripSubscribers.filter(sub => {
    if (status !== 'All' && sub.status !== status) return false;
    if (status === 'All' && sub.status === 'deleted') return false;
    if (campaign !== 'All' && sub.campaign_type !== campaign) return false;
    if (search) {
      const nameMatch = (sub.name || '').toLowerCase().includes(search);
      const phoneMatch = (sub.phone || '').includes(search);
      const catMatch = (sub.category || '').toLowerCase().includes(search);
      if (!nameMatch && !phoneMatch && !catMatch) return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    elements.dripSubscribersTableBody.innerHTML = `
      <tr>
        <td colspan="8" class="empty-state">No students found matching current filters in drip sequence.</td>
      </tr>
    `;
    return;
  }

  elements.dripSubscribersTableBody.innerHTML = filtered.map(sub => {
    const campaignBadge = sub.campaign_type === 'lab_visit'
      ? '<span class="badge-campaign badge-campaign-lab_visit"><i class="fa-solid fa-vial-virus"></i> Lab Visit</span>'
      : (sub.campaign_type === 'call_inquiry'
          ? '<span class="badge-campaign badge-campaign-call_inquiry"><i class="fa-solid fa-phone-volume"></i> Call Inquiry</span>'
          : '<span class="badge-campaign badge-campaign-inquiry"><i class="fa-brands fa-whatsapp"></i> Inquiry</span>');

    const statusBadge = `<span class="status-pill status-${sub.status}">${sub.status.toUpperCase()}</span>`;
    const nextSendStr = sub.status === 'active' && sub.next_run_at
      ? formatIndianDateTime(sub.next_run_at)
      : '—';

    const stepDisplay = sub.current_step === 0 ? 'Pending Day 1' : `Day ${sub.current_step} / 6`;

    return `
      <tr>
        <td><strong>${escapeHtml(sub.name || 'Student')}</strong></td>
        <td>+${escapeHtml(sub.phone)}</td>
        <td>${campaignBadge}</td>
        <td>
          <strong style="color:var(--primary-dark);">${escapeHtml(sub.category || 'General')}</strong>
          ${sub.lead_notes ? `<div style="font-size:11px; color:#64748B; margin-top:3px; max-width:220px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${escapeHtml(sub.lead_notes)}"><i class="fa-regular fa-note-sticky"></i> ${escapeHtml(sub.lead_notes)}</div>` : ''}
        </td>
        <td>
          <strong>${stepDisplay}</strong>
        </td>
        <td><small>${nextSendStr}</small></td>
        <td>${statusBadge}</td>
        <td>
          <div style="display:flex; gap:6px; flex-wrap:wrap;">
            ${sub.status === 'active' ? `
              <button class="btn btn-secondary btn-sm" onclick="sendDripNow(${sub.id})" title="Send current scheduled day message immediately">
                <i class="fa-solid fa-paper-plane"></i> Send Now
              </button>
              <button class="btn btn-secondary btn-sm" onclick="updateDripSubscriberStatus(${sub.id}, 'paused')" title="Pause drip sequence">
                <i class="fa-solid fa-pause"></i>
              </button>
            ` : ''}
            ${sub.status === 'paused' ? `
              <button class="btn btn-secondary btn-sm" onclick="updateDripSubscriberStatus(${sub.id}, 'active')" title="Resume drip sequence">
                <i class="fa-solid fa-play"></i> Resume
              </button>
            ` : ''}
            ${sub.status !== 'deleted' ? `
              <button class="btn btn-secondary btn-sm" onclick="resetDripSubscriber(${sub.id})" title="Reset sequence back to Day 1 to re-send">
                <i class="fa-solid fa-rotate-left"></i> Reset
              </button>
            ` : ''}
            ${sub.status !== 'enrolled' && sub.status !== 'deleted' ? `
              <button class="btn btn-secondary btn-sm" onclick="updateDripSubscriberStatus(${sub.id}, 'enrolled')" title="Mark as Enrolled (Halt Drip)">
                <i class="fa-solid fa-graduation-cap"></i> Enrolled
              </button>
            ` : (sub.status === 'enrolled' ? '<span style="color:#059669; font-size:12px; font-weight:600;"><i class="fa-solid fa-circle-check"></i> Enrolled</span>' : '')}
            ${sub.status !== 'deleted' ? `
              <button class="btn btn-danger btn-sm" onclick="deleteDripSubscriber(${sub.id}, '${escapeHtml(sub.name || '')}', '${escapeHtml(sub.phone)}')" title="Delete contact from 6-day drip campaigns" style="background:#EF4444; border-color:#EF4444; color:#fff;">
                <i class="fa-solid fa-trash"></i> Delete
              </button>
            ` : `
              <button class="btn btn-secondary btn-sm" onclick="restoreDripSubscriber(${sub.id})" title="Restore contact back to drip sequence">
                <i class="fa-solid fa-rotate-left"></i> Restore
              </button>
            `}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

async function fetchDripLogs() {
  try {
    const res = await fetch('/api/drip/logs?limit=100');
    if (!res.ok) return;
    state.dripLogs = await res.json();
    renderDripLogs();
  } catch (err) {
    console.error('Failed to fetch drip logs:', err);
  }
}

function renderDripLogs() {
  if (!elements.dripLogsTableBody) return;

  const search = state.dripLogsSearch;
  const filtered = state.dripLogs.filter(log => {
    if (!search) return true;
    const nameMatch = (log.name || '').toLowerCase().includes(search);
    const phoneMatch = (log.phone || '').includes(search);
    const msgMatch = (log.message || '').toLowerCase().includes(search);
    return nameMatch || phoneMatch || msgMatch;
  });

  if (filtered.length === 0) {
    elements.dripLogsTableBody.innerHTML = `
      <tr>
        <td colspan="7" class="empty-state">No sent drip messages found. When the bot sends follow-ups, they will be logged here.</td>
      </tr>
    `;
    return;
  }

  elements.dripLogsTableBody.innerHTML = filtered.map(log => {
    const campaignBadge = log.campaign_type === 'lab_visit'
      ? '<span class="badge-campaign badge-campaign-lab_visit">Lab Visit</span>'
      : '<span class="badge-campaign badge-campaign-inquiry">Inquiry</span>';

    return `
      <tr>
        <td style="white-space:nowrap;"><small>${formatIndianDateTime(log.sent_at)}</small></td>
        <td><strong>${escapeHtml(log.name || 'Student')}</strong></td>
        <td>+${escapeHtml(log.phone)}</td>
        <td>${campaignBadge}</td>
        <td><strong>Day ${log.day_number || 1}</strong></td>
        <td style="max-width:320px;">
          <div style="font-size:12px; max-height:80px; overflow-y:auto; white-space:pre-wrap; background:#F8FAFC; padding:6px 10px; border-radius:6px; border:1px solid #E2E8F0;">${escapeHtml(log.message || '')}</div>
        </td>
        <td><span class="status-pill status-enrolled">${escapeHtml(log.status || 'Sent')}</span></td>
      </tr>
    `;
  }).join('');
}

async function fetchDripTemplates() {
  try {
    const res = await fetch('/api/drip/templates');
    if (!res.ok) return;
    state.dripTemplates = await res.json();
    renderDripTemplates();
  } catch (err) {
    console.error('Failed to fetch drip templates:', err);
  }
}

function toggleDripTemplateCampaign(campaign) {
  state.dripTemplateCampaign = campaign;
  elements.btnToggleTplInquiry?.classList.toggle('active-campaign-toggle', campaign === 'inquiry');
  elements.btnToggleTplLabVisit?.classList.toggle('active-campaign-toggle', campaign === 'lab_visit');
  renderDripTemplates();
}

function renderDripTemplates() {
  if (!elements.dripTemplatesList) return;

  const currentType = state.dripTemplateCampaign;
  const templates = state.dripTemplates.filter(t => t.campaign_type === currentType);

  if (templates.length === 0) {
    elements.dripTemplatesList.innerHTML = '<p class="empty-state">No templates found for this campaign.</p>';
    return;
  }

  elements.dripTemplatesList.innerHTML = templates.map(t => {
    const delayDays = Math.round(t.delay_hours / 24);
    const delayLabel = t.delay_hours < 24 ? `${t.delay_hours}h after visit` : `Day ${t.day_number} (+${delayDays}d)`;

    return `
      <div class="template-card">
        <div class="template-header">
          <span class="template-day-badge">Day ${t.day_number} Sequence</span>
          <span style="font-size:12px; font-weight:600; color:var(--text-secondary);"><i class="fa-regular fa-clock"></i> ${delayLabel}</span>
        </div>
        <div class="template-title">${escapeHtml(t.title)}</div>
        <div class="template-body">${escapeHtml(t.message)}</div>
        <div class="template-footer">
          <span>Variables: <code>{name}</code></span>
          <button class="btn btn-secondary btn-sm" onclick="openEditTemplateModal(${t.id})">
            <i class="fa-solid fa-pen"></i> Edit Template
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// Lab Visit Student Modal Handlers
function openAddLabVisitModal() {
  if (elements.formAddLabVisit) elements.formAddLabVisit.reset();
  if (elements.labVisitDate) {
    const today = new Date().toISOString().split('T')[0];
    elements.labVisitDate.value = today;
  }
  elements.modalAddLabVisit?.classList.add('active');
}

function closeAddLabVisitModal() {
  elements.modalAddLabVisit?.classList.remove('active');
}

async function submitLabVisit() {
  const name = elements.labVisitName?.value.trim();
  const rawPhone = elements.labVisitPhone?.value.trim();
  const course = elements.labVisitCourse?.value;
  const visitDate = elements.labVisitDate?.value;
  const notes = elements.labVisitNotes?.value.trim();

  if (!name || !rawPhone) {
    alert('Please enter student name and 10-digit WhatsApp phone number.');
    return;
  }

  const phone = rawPhone.replace(/[^0-9]/g, '');
  if (phone.length < 10) {
    alert('Please enter a valid 10-digit Indian phone number.');
    return;
  }

  try {
    const res = await fetch('/api/drip/lab-visit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phone, course, courseInterest: course, visitDate, notes })
    });

    const data = await res.json();
    if (res.ok && data.success) {
      alert(`Student "${name}" registered successfully!\nEnrolled in 6-Day Lab Visit Drip Campaign.`);
      closeAddLabVisitModal();
      await fetchDripStats();
      await fetchDripSubscribers();
      await fetchLabVisits();
      await fetchLeads();
    } else {
      alert('Error registering lab visit student: ' + (data.error || 'Server error'));
    }
  } catch (err) {
    alert('Failed to register lab visit student: ' + err.message);
  }
}

// Call Inquiry Student Modal Handlers
function openAddCallInquiryModal() {
  if (elements.formAddCallInquiry) elements.formAddCallInquiry.reset();
  if (elements.callInquiryDate) {
    const today = new Date().toISOString().split('T')[0];
    elements.callInquiryDate.value = today;
  }
  if (elements.callInquiryCampaignType) elements.callInquiryCampaignType.value = 'inquiry';
  if (elements.callInquiryScheduleMode) elements.callInquiryScheduleMode.value = 'tomorrow_morning';
  elements.modalAddCallInquiry?.classList.add('active');
}

function closeAddCallInquiryModal() {
  elements.modalAddCallInquiry?.classList.remove('active');
}

async function submitCallInquiry() {
  const name = elements.callInquiryName?.value.trim();
  const rawPhone = elements.callInquiryPhone?.value.trim();
  const course = elements.callInquiryCourse?.value;
  const campaignType = elements.callInquiryCampaignType?.value || 'inquiry';
  const scheduleMode = elements.callInquiryScheduleMode?.value || 'tomorrow_morning';
  const callDate = elements.callInquiryDate?.value;
  const notes = elements.callInquiryNotes?.value.trim();

  if (!name || !rawPhone) {
    alert('Please enter student name and 10-digit WhatsApp phone number.');
    return;
  }

  const phone = rawPhone.replace(/[^0-9]/g, '');
  if (phone.length < 10) {
    alert('Please enter a valid 10-digit Indian mobile number.');
    return;
  }

  try {
    const res = await fetch('/api/drip/call-inquiry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phone, course, courseInterest: course, callDate, notes, campaignType, scheduleMode })
    });

    const data = await res.json();
    if (res.ok && data.success) {
      const scheduleLabel = scheduleMode === 'immediate' ? 'Immediately' : (scheduleMode === '2_hours' ? 'in 2 Hours' : 'Tomorrow at 9:00 AM IST');
      alert(`Student "${name}" registered successfully!\nEnrolled in ${campaignType === 'lab_visit' ? 'Lab Visit' : 'Inquiry'} Drip Campaign.\nFirst message scheduled: ${scheduleLabel}.`);
      closeAddCallInquiryModal();
      await fetchDripStats();
      await fetchDripSubscribers();
      await fetchCallInquiries();
      await fetchLeads();
    } else {
      alert('Error registering call inquiry student: ' + (data.error || 'Server error'));
    }
  } catch (err) {
    alert('Failed to register call inquiry student: ' + err.message);
  }
}

// Drip Excel Bulk Import Modal Handlers
function openDripExcelModal() {
  state.dripExcelRawRows = [];
  state.dripExcelColumns = [];
  state.dripExcelParsedStudents = [];

  if (elements.dripExcelFileInput) elements.dripExcelFileInput.value = '';
  if (elements.dripExcelMappingSection) elements.dripExcelMappingSection.style.display = 'none';
  if (elements.dripExcelPreviewSection) elements.dripExcelPreviewSection.style.display = 'none';
  if (elements.btnSubmitDripExcelImport) {
    elements.btnSubmitDripExcelImport.disabled = true;
    elements.btnSubmitDripExcelImport.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Import & Enroll Students in Drip';
  }
  if (elements.dripExcelDropzone) {
    elements.dripExcelDropzone.innerHTML = `
      <i class="fa-solid fa-cloud-arrow-up" style="font-size:32px; color:#107C41; margin-bottom:8px;"></i>
      <div style="font-weight:600; color:#334155;">Click to browse or drag & drop student Excel file</div>
      <div style="font-size:12px; color:#64748b; margin-top:4px;">Supports .xlsx, .xls, .csv format (Auto-detects Name, Phone, Course, Notes)</div>
      <input type="file" id="dripExcelFileInput" accept=".xlsx, .xls, .csv" style="display:none;">
    `;
    const newFileInput = elements.dripExcelDropzone.querySelector('#dripExcelFileInput');
    if (newFileInput) {
      newFileInput.addEventListener('change', handleDripExcelFileSelected);
      elements.dripExcelFileInput = newFileInput;
    }
  }

  elements.modalDripImportExcel?.classList.add('active');
}

function closeDripExcelModal() {
  elements.modalDripImportExcel?.classList.remove('active');
}

function downloadDripSampleExcel() {
  if (typeof XLSX === 'undefined') {
    alert('Excel parser library (SheetJS) is still loading. Please try again in a moment.');
    return;
  }

  const sampleData = [
    {
      "Student Name": "Rahul Sharma",
      "Mobile Number": "9876543210",
      "Course Interest": "Advance Biotech Training (15 Days)",
      "Notes / Remarks": "Inquired on call about molecular biology batch starting next week"
    },
    {
      "Student Name": "Priya Patel",
      "Mobile Number": "9812345678",
      "Course Interest": "Industrial Training (30 Days)",
      "Notes / Remarks": "Visited lab with parents, interested in cell culture protocols"
    },
    {
      "Student Name": "Amit Kumar",
      "Mobile Number": "9723456789",
      "Course Interest": "Project / Dissertation",
      "Notes / Remarks": "M.Sc student looking for 6-month dissertation bench work"
    },
    {
      "Student Name": "Neha Gupta",
      "Mobile Number": "9934567890",
      "Course Interest": "Short Term Training (7 Days)",
      "Notes / Remarks": "Inquired via phone call about fee and weekend options"
    }
  ];

  const ws = XLSX.utils.json_to_sheet(sampleData);
  ws['!cols'] = [
    { wch: 22 },
    { wch: 18 },
    { wch: 34 },
    { wch: 45 }
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Students_Drip_Import");
  XLSX.writeFile(wb, "Helix_Drip_Import_Template.xlsx");
}

async function handleDripExcelFileSelected(e) {
  const file = e.target.files?.[0];
  if (!file) return;

  if (typeof XLSX === 'undefined') {
    alert('Excel parser library (SheetJS) is loading. Please try again in a few seconds.');
    return;
  }

  if (elements.dripExcelDropzone) {
    elements.dripExcelDropzone.innerHTML = `
      <i class="fa-solid fa-file-excel" style="font-size:32px; color:#107C41; margin-bottom:8px;"></i>
      <div style="font-weight:600; color:#166534;">${escapeHtml(file.name)}</div>
      <div style="font-size:12px; color:#64748b; margin-top:4px;">${(file.size / 1024).toFixed(1)} KB &bull; Click to choose a different file</div>
      <input type="file" id="dripExcelFileInput" accept=".xlsx, .xls, .csv" style="display:none;">
    `;
    const newFileInput = elements.dripExcelDropzone.querySelector('#dripExcelFileInput');
    if (newFileInput) {
      newFileInput.addEventListener('change', handleDripExcelFileSelected);
      elements.dripExcelFileInput = newFileInput;
    }
  }

  try {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      alert('The uploaded Excel workbook contains no sheets.');
      return;
    }

    const worksheet = workbook.Sheets[firstSheetName];
    const rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

    if (!rawRows || rawRows.length === 0) {
      alert('No data rows found in the uploaded sheet. Please make sure the first row contains headers and subsequent rows contain students.');
      return;
    }

    // Extract all unique column headers
    const columns = [];
    rawRows.forEach(row => {
      Object.keys(row).forEach(k => {
        const trimmed = k.trim();
        if (trimmed && !columns.includes(trimmed)) {
          columns.push(trimmed);
        }
      });
    });

    if (columns.length === 0) {
      alert('Could not find any column headers in the uploaded file.');
      return;
    }

    state.dripExcelRawRows = rawRows;
    state.dripExcelColumns = columns;

    // Populate column mapping selectors
    const populateDropdown = (elem, detectedKey, noneLabel = null) => {
      if (!elem) return;
      let html = '';
      if (noneLabel) {
        html += `<option value="">-- None / Skip --</option>`;
      }
      html += columns.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
      elem.innerHTML = html;
      if (detectedKey && columns.includes(detectedKey)) {
        elem.value = detectedKey;
      }
    };

    // Auto-detect columns
    const nameKeywords = ['name', 'student name', 'candidate name', 'student', 'candidate', 'full name', 'first name', 'naam'];
    const phoneKeywords = ['phone', 'mobile', 'whatsapp', 'contact', 'number', 'mobile number', 'phone number', 'cell', 'tel', 'mob'];
    const courseKeywords = ['course', 'program', 'training', 'subject', 'interest', 'course interest', 'department'];
    const notesKeywords = ['note', 'notes', 'remark', 'remarks', 'comment', 'comments', 'detail', 'details', 'discussion'];

    const detectedNameCol = columns.find(c => nameKeywords.includes(c.toLowerCase().trim())) ||
                            columns.find(c => nameKeywords.some(k => c.toLowerCase().includes(k))) ||
                            columns[0];

    const detectedPhoneCol = columns.find(c => phoneKeywords.includes(c.toLowerCase().trim())) ||
                             columns.find(c => phoneKeywords.some(k => c.toLowerCase().includes(k))) ||
                             (columns.length > 1 ? columns[1] : columns[0]);

    const detectedCourseCol = columns.find(c => courseKeywords.includes(c.toLowerCase().trim())) ||
                              columns.find(c => courseKeywords.some(k => c.toLowerCase().includes(k))) ||
                              '';

    const detectedNotesCol = columns.find(c => notesKeywords.includes(c.toLowerCase().trim())) ||
                             columns.find(c => notesKeywords.some(k => c.toLowerCase().includes(k))) ||
                             '';

    populateDropdown(elements.dripExcelNameCol, detectedNameCol);
    populateDropdown(elements.dripExcelPhoneCol, detectedPhoneCol);
    populateDropdown(elements.dripExcelCourseCol, detectedCourseCol, true);
    populateDropdown(elements.dripExcelNotesCol, detectedNotesCol, true);

    if (elements.dripExcelMappingSection) elements.dripExcelMappingSection.style.display = 'block';

    processDripExcelRows();
  } catch (err) {
    console.error('Failed to parse Drip Excel file:', err);
    alert('Error reading Excel/CSV file: ' + err.message);
  }
}

function processDripExcelRows() {
  const nameCol = elements.dripExcelNameCol?.value;
  const phoneCol = elements.dripExcelPhoneCol?.value;
  const courseCol = elements.dripExcelCourseCol?.value;
  const notesCol = elements.dripExcelNotesCol?.value;

  if (!state.dripExcelRawRows || state.dripExcelRawRows.length === 0) return;

  const validStudents = [];
  let invalidCount = 0;

  state.dripExcelRawRows.forEach((row, idx) => {
    const rawName = String(row[nameCol] || '').trim();
    const rawPhone = String(row[phoneCol] || '').trim();
    const rawCourse = courseCol ? String(row[courseCol] || '').trim() : '';
    const rawNotes = notesCol ? String(row[notesCol] || '').trim() : '';

    const digitsOnly = rawPhone.replace(/[^0-9]/g, '');
    let cleanPhone = null;

    if (digitsOnly.length === 10) {
      cleanPhone = '91' + digitsOnly;
    } else if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) {
      cleanPhone = digitsOnly;
    } else if (digitsOnly.length > 10 && digitsOnly.startsWith('0')) {
      cleanPhone = '91' + digitsOnly.slice(-10);
    } else if (digitsOnly.length >= 10) {
      cleanPhone = digitsOnly;
    }

    if (cleanPhone && cleanPhone.length >= 10) {
      validStudents.push({
        name: rawName || 'Student',
        phone: cleanPhone,
        rawPhone: rawPhone,
        course: rawCourse || 'General',
        notes: rawNotes
      });
    } else {
      invalidCount++;
    }
  });

  state.dripExcelParsedStudents = validStudents;

  // Render Preview
  if (elements.dripExcelPreviewSection) elements.dripExcelPreviewSection.style.display = 'block';

  if (elements.dripExcelSummaryBadge) {
    elements.dripExcelSummaryBadge.innerHTML = `
      <i class="fa-solid fa-circle-check"></i> ${validStudents.length} Valid Students Found
      ${invalidCount > 0 ? `<span style="color:#dc2626; margin-left:6px;">(${invalidCount} skipped - invalid phone)</span>` : ''}
    `;
  }

  if (elements.dripExcelPreviewBody) {
    const previewSubset = validStudents.slice(0, 5);
    if (previewSubset.length === 0) {
      elements.dripExcelPreviewBody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#94a3b8; padding:12px;">No valid student records found. Check column mapping.</td></tr>`;
    } else {
      elements.dripExcelPreviewBody.innerHTML = previewSubset.map((s, i) => `
        <tr>
          <td style="padding:6px 10px; color:#64748b;">${i + 1}</td>
          <td style="padding:6px 10px; font-weight:600;">${escapeHtml(s.name)}</td>
          <td style="padding:6px 10px; font-family:monospace; color:#0369a1;">+${escapeHtml(s.phone)}</td>
          <td style="padding:6px 10px;">${escapeHtml(s.course)}</td>
          <td style="padding:6px 10px; color:#64748b; font-size:11px; max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(s.notes || '—')}</td>
        </tr>
      `).join('');
      if (validStudents.length > 5) {
        elements.dripExcelPreviewBody.innerHTML += `
          <tr>
            <td colspan="5" style="text-align:center; color:#64748b; background:#f8fafc; font-style:italic; padding:6px;">
              ... and ${validStudents.length - 5} more students ready to enroll
            </td>
          </tr>
        `;
      }
    }
  }

  if (elements.btnSubmitDripExcelImport) {
    elements.btnSubmitDripExcelImport.disabled = validStudents.length === 0;
    elements.btnSubmitDripExcelImport.innerHTML = `
      <i class="fa-solid fa-cloud-arrow-up"></i> Import & Enroll ${validStudents.length} Students in Drip
    `;
  }
}

async function submitDripExcelImport() {
  const students = state.dripExcelParsedStudents;
  if (!students || students.length === 0) {
    alert('No valid student records found to import.');
    return;
  }

  const campaignType = elements.dripImportCampaignType?.value || 'inquiry';
  const scheduleMode = elements.dripImportScheduleMode?.value || 'tomorrow_morning';

  const scheduleLabel = scheduleMode === 'immediate'
    ? 'Immediately (Next cron run)'
    : (scheduleMode === '2_hours' ? 'in 2 Hours' : 'Tomorrow morning at 9:00 AM IST');

  if (!confirm(`Are you sure you want to enroll ${students.length} students into the ${campaignType === 'lab_visit' ? 'Lab Visit' : 'Inquiry'} Drip Campaign?\nFirst message will be scheduled for: ${scheduleLabel}.`)) {
    return;
  }

  if (elements.btnSubmitDripExcelImport) {
    elements.btnSubmitDripExcelImport.disabled = true;
    elements.btnSubmitDripExcelImport.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Enrolling students...';
  }

  try {
    const res = await fetch('/api/drip/import-excel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ students, campaignType, scheduleMode })
    });

    const data = await res.json();
    if (res.ok && data.success) {
      alert(`Success! Enrolled ${data.enrolledCount} students into the Drip Campaign.\n(${data.skippedCount} skipped as already active or duplicate).`);
      closeDripExcelModal();
      await fetchDripStats();
      await fetchDripSubscribers();
      await fetchLabVisits();
      await fetchCallInquiries();
      await fetchLeads();
    } else {
      alert('Error importing students: ' + (data.error || 'Server error'));
      if (elements.btnSubmitDripExcelImport) {
        elements.btnSubmitDripExcelImport.disabled = false;
        elements.btnSubmitDripExcelImport.innerHTML = `<i class="fa-solid fa-cloud-arrow-up"></i> Import & Enroll ${students.length} Students in Drip`;
      }
    }
  } catch (err) {
    alert('Failed to import students to drip: ' + err.message);
    if (elements.btnSubmitDripExcelImport) {
      elements.btnSubmitDripExcelImport.disabled = false;
      elements.btnSubmitDripExcelImport.innerHTML = `<i class="fa-solid fa-cloud-arrow-up"></i> Import & Enroll ${students.length} Students in Drip`;
    }
  }
}

// Edit Template Modal Handlers
window.openEditTemplateModal = function(id) {
  const tpl = state.dripTemplates.find(t => t.id === id);
  if (!tpl) return;

  if (elements.editTemplateId) elements.editTemplateId.value = tpl.id;
  if (elements.editTemplateTitle) elements.editTemplateTitle.value = tpl.title;
  if (elements.editTemplateMessage) elements.editTemplateMessage.value = tpl.message;

  elements.modalEditTemplate?.classList.add('active');
};

function closeEditTemplateModal() {
  elements.modalEditTemplate?.classList.remove('active');
}

async function saveDripTemplate() {
  const id = elements.editTemplateId?.value;
  const title = elements.editTemplateTitle?.value.trim();
  let message = elements.editTemplateMessage?.value.trim();

  if (!id || !title || !message) {
    alert('Please enter both title and message content.');
    return;
  }

  // Ensure no asterisks
  message = message.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1').replace(/\*/g, '');

  try {
    const res = await fetch(`/api/drip/templates/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, message })
    });

    const data = await res.json();
    if (res.ok && data.success) {
      closeEditTemplateModal();
      await fetchDripTemplates();
      alert('Template updated successfully!');
    } else {
      alert('Failed to update template: ' + (data.error || 'Server error'));
    }
  } catch (err) {
    alert('Failed to save template: ' + err.message);
  }
}

// Subscriber Actions
window.sendDripNow = async function(id) {
  if (!confirm('Are you sure you want to send this drip message immediately?')) return;

  try {
    const res = await fetch(`/api/drip/subscribers/${id}/send-now`, { method: 'POST' });
    const data = await res.json();
    if (res.ok && data.success) {
      alert('Drip message sent successfully via WhatsApp!');
      await fetchDripStats();
      await fetchDripSubscribers();
      await fetchDripLogs();
    } else {
      alert('Failed to send drip message: ' + (data.error || 'Server error'));
    }
  } catch (err) {
    alert('Error sending drip message: ' + err.message);
  }
};

window.resetDripSubscriber = async function(id) {
  if (!confirm('Reset this student follow-up sequence back to Day 1?')) return;

  try {
    const res = await fetch(`/api/drip/subscribers/${id}/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ step: 0 })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      alert('Student sequence reset to Day 1. You can now send or schedule Day 1 follow-up.');
      await fetchDripStats();
      await fetchDripSubscribers();
    } else {
      alert('Failed to reset: ' + (data.error || 'Server error'));
    }
  } catch (err) {
    alert('Error resetting student: ' + err.message);
  }
};

window.updateDripSubscriberStatus = async function(id, newStatus) {
  const confirmMsg = newStatus === 'enrolled'
    ? 'Mark this student as Enrolled? This will immediately halt all future automated drip messages.'
    : `Set drip status to "${newStatus}"?`;

  if (!confirm(confirmMsg)) return;

  try {
    const res = await fetch(`/api/drip/subscribers/${id}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });

    const data = await res.json();
    if (res.ok && data.success) {
      await fetchDripStats();
      await fetchDripSubscribers();
      if (newStatus === 'enrolled') {
        await fetchLeads();
      }
    } else {
      alert('Failed to update status: ' + (data.error || 'Server error'));
    }
  } catch (err) {
    alert('Error updating status: ' + err.message);
  }
};

window.deleteDripSubscriber = async function(id, name, phone) {
  const confirmMsg = `Delete ${name || 'Student'} (+${phone}) from 6-day drip campaigns?\n\nThis contact will be removed immediately from drip follow-ups. They will NOT be re-added by Excel sheets or manual registration until they send a new WhatsApp chat to the bot.`;
  if (!confirm(confirmMsg)) return;

  try {
    const res = await fetch(`/api/drip/subscribers/${id}`, {
      method: 'DELETE'
    });
    const data = await res.json();
    if (res.ok && data.success) {
      await fetchDripStats();
      await fetchDripSubscribers();
    } else {
      alert('Failed to delete student: ' + (data.error || 'Server error'));
    }
  } catch (err) {
    alert('Error deleting subscriber: ' + err.message);
  }
};

window.restoreDripSubscriber = async function(id) {
  if (!confirm('Restore this contact back to active 6-day drip follow-ups?')) return;
  try {
    const res = await fetch(`/api/drip/subscribers/${id}/restore`, {
      method: 'POST'
    });
    const data = await res.json();
    if (res.ok && data.success) {
      await fetchDripStats();
      await fetchDripSubscribers();
    } else {
      alert('Failed to restore student: ' + (data.error || 'Server error'));
    }
  } catch (err) {
    alert('Error restoring subscriber: ' + err.message);
  }
};


// ----------------------------------------------------
// CONFIGURATION & AI METHODS
// ----------------------------------------------------

async function fetchConfig() {
  try {
    const res = await fetch('/api/config');
    if (!res.ok) return;
    const config = await res.json();

    if (elements.cfgAdminPhone && config.ADMIN_PHONE) elements.cfgAdminPhone.value = config.ADMIN_PHONE;
    if (elements.cfgBrochureUrl && config.BROCHURE_URL) elements.cfgBrochureUrl.value = config.BROCHURE_URL;
    if (elements.cfgAiEnabled && config.AI_ENABLED !== undefined) elements.cfgAiEnabled.value = config.AI_ENABLED;
    if (elements.cfgAiModel && config.AI_MODEL) elements.cfgAiModel.value = config.AI_MODEL;
    if (elements.cfgGeminiApiKey && config.GEMINI_API_KEY) elements.cfgGeminiApiKey.value = config.GEMINI_API_KEY;
    if (elements.cfgAiSystemPrompt && config.AI_SYSTEM_PROMPT) elements.cfgAiSystemPrompt.value = config.AI_SYSTEM_PROMPT;

    updateAiStatusBadge(config.AI_ENABLED === '1' && !!config.GEMINI_API_KEY);
  } catch (err) {
    console.error('Failed to fetch config:', err);
  }
}

function updateAiStatusBadge(isActive) {
  if (!elements.aiStatusBadge) return;
  if (isActive) {
    elements.aiStatusBadge.className = 'status-pill status-enrolled';
    elements.aiStatusBadge.textContent = 'AI Active';
  } else {
    elements.aiStatusBadge.className = 'status-pill status-lost';
    elements.aiStatusBadge.textContent = 'AI Disabled';
  }
}

async function saveGeneralConfig(e) {
  if (e) e.preventDefault();
  try {
    const payload = {
      ADMIN_PHONE: elements.cfgAdminPhone.value.trim(),
      BROCHURE_URL: elements.cfgBrochureUrl.value.trim()
    };
    const res = await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      alert('General settings saved successfully!');
    } else {
      alert('Failed to save settings.');
    }
  } catch (err) {
    console.error('Error saving general config:', err);
    alert('Error saving settings: ' + err.message);
  }
}

async function saveAiConfig(e) {
  if (e) e.preventDefault();
  try {
    const payload = {
      AI_ENABLED: elements.cfgAiEnabled.value,
      AI_MODEL: elements.cfgAiModel.value,
      GEMINI_API_KEY: elements.cfgGeminiApiKey.value.trim(),
      AI_SYSTEM_PROMPT: elements.cfgAiSystemPrompt.value.trim()
    };
    const res = await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      updateAiStatusBadge(payload.AI_ENABLED === '1' && !!payload.GEMINI_API_KEY);
      alert('Gemini AI settings saved successfully!');
    } else {
      alert('Failed to save AI settings.');
    }
  } catch (err) {
    console.error('Error saving AI config:', err);
    alert('Error saving AI settings: ' + err.message);
  }
}

async function testAiConnection() {
  const apiKey = elements.cfgGeminiApiKey.value.trim();
  const model = elements.cfgAiModel.value;
  const systemPrompt = elements.cfgAiSystemPrompt.value.trim();

  if (!apiKey) {
    alert('Please enter a Gemini API Key to test.');
    return;
  }

  elements.aiTestStatus.textContent = 'Testing connection...';
  elements.aiTestStatus.style.color = '#6B21A8';
  elements.aiTestResultBox.style.display = 'none';

  try {
    const res = await fetch('/api/test-ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey, model, systemPrompt })
    });
    const data = await res.json();
    if (data.success) {
      elements.aiTestStatus.textContent = 'Connected successfully! Settings saved & AI is active.';
      elements.aiTestStatus.style.color = '#059669';
      elements.aiTestReplyText.textContent = data.reply;
      elements.aiTestResultBox.style.display = 'block';
      // Automatically persist to database so bot uses it right away
      try {
        await fetch('/api/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            AI_ENABLED: elements.cfgAiEnabled ? elements.cfgAiEnabled.value : '1',
            AI_MODEL: model,
            GEMINI_API_KEY: apiKey,
            AI_SYSTEM_PROMPT: systemPrompt
          })
        });
        updateAiStatusBadge(true);
      } catch (err) {
        console.warn('Auto-save error:', err);
      }
    } else {
      elements.aiTestStatus.textContent = 'Connection failed: ' + (data.error || 'Unknown error');
      elements.aiTestStatus.style.color = '#DC2626';
    }
  } catch (err) {
    elements.aiTestStatus.textContent = 'Network error: ' + err.message;
    elements.aiTestStatus.style.color = '#DC2626';
  }
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Indian Standard Time (IST - Asia/Kolkata) Formatter
function formatIndianTime(timestamp) {
  if (!timestamp) return '';
  let str = String(timestamp).trim();
  // If in SQLite format 'YYYY-MM-DD HH:mm:ss' (UTC), append Z so browser treats it as UTC
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(str)) {
    str = str.replace(' ', 'T') + 'Z';
  }
  const date = new Date(str);
  if (isNaN(date.getTime())) return '';

  return date.toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

function formatIndianDateTime(timestamp) {
  if (!timestamp) return '';
  let str = String(timestamp).trim();
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(str)) {
    str = str.replace(' ', 'T') + 'Z';
  }
  const date = new Date(str);
  if (isNaN(date.getTime())) return '';

  return date.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

function formatIndianDate(timestamp) {
  if (!timestamp) return '';
  let str = String(timestamp).trim();
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(str)) {
    str = str.replace(' ', 'T') + 'Z';
  }
  const date = new Date(str);
  if (isNaN(date.getTime())) return '';

  return date.toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

// ----------------------------------------------------
// CUSTOM CAMPAIGNS MODULE
// ----------------------------------------------------

async function loadCampaignsData() {
  await fetchCampaigns();
  updateLeadAudienceCount();
}

async function fetchCampaigns() {
  try {
    const res = await fetch('/api/campaigns');
    if (!res.ok) return;
    const data = await res.json();
    state.campaigns = data;
    renderCampaigns(data);
  } catch (err) {
    console.error('Failed to fetch campaigns:', err);
  }
}

function renderCampaigns(campaigns) {
  if (elements.statTotalCampaigns) elements.statTotalCampaigns.textContent = campaigns.length;
  let sentTotal = 0;
  let mediaTotal = 0;
  campaigns.forEach(c => {
    sentTotal += (c.sent_count || 0);
    if (c.attachment_type) mediaTotal++;
  });
  if (elements.statCampaignsSent) elements.statCampaignsSent.textContent = sentTotal;
  if (elements.statMediaBroadcasts) elements.statMediaBroadcasts.textContent = mediaTotal;

  const hasRunning = campaigns.some(c => c.status === 'in_progress' || c.status === 'sending');
  if (elements.btnNavbarStopBroadcast) elements.btnNavbarStopBroadcast.style.display = hasRunning ? 'inline-flex' : 'none';
  if (elements.btnEmergencyStopCampaign) elements.btnEmergencyStopCampaign.style.display = hasRunning ? 'inline-flex' : 'none';
  if (elements.campaignStatusBadge) elements.campaignStatusBadge.style.display = hasRunning ? 'inline-block' : 'none';

  if (!campaigns || campaigns.length === 0) {
    elements.campaignsTableBody.innerHTML = '<tr><td colspan="8" class="empty-state">No broadcast campaigns launched yet.</td></tr>';
    return;
  }

  elements.campaignsTableBody.innerHTML = campaigns.map(c => {
    let statusHtml = '';
    if (c.status === 'completed') {
      statusHtml = '<span class="status-pill status-enrolled"><i class="fa-solid fa-circle-check"></i> Completed</span>';
    } else if (c.status === 'cancelled') {
      statusHtml = '<span class="status-pill" style="background:#FEE2E2; color:#DC2626; font-weight:600;"><i class="fa-solid fa-ban"></i> Stopped</span>';
    } else if (c.status === 'in_progress' || c.status === 'sending') {
      statusHtml = '<span class="status-pill status-in-progress"><i class="fa-solid fa-spinner fa-spin"></i> Broadcasting</span>';
    } else {
      statusHtml = `<span class="status-pill status-new">${escapeHtml(c.status)}</span>`;
    }

    const attachmentLabel = c.attachment_type
      ? `<span class="badge-campaign badge-campaign-inquiry"><i class="fa-solid fa-paperclip"></i> ${escapeHtml(c.attachment_type.toUpperCase())}</span>`
      : '<span style="color:var(--text-secondary);">None (Text)</span>';

    const isRunning = c.status === 'in_progress' || c.status === 'sending';
    const stopBtn = isRunning ? `
      <button class="btn btn-danger btn-sm" onclick="stopRunningCampaign()" style="margin-left:6px; background:#DC2626; color:#fff;" title="Stop broadcast immediately">
        <i class="fa-solid fa-hand"></i> Stop
      </button>
    ` : '';

    return `
      <tr>
        <td><strong>${escapeHtml(c.title)}</strong></td>
        <td>${formatIndianDateTime(c.created_at)}</td>
        <td>${c.total_recipients || 0}</td>
        <td><span style="color:#059669; font-weight:600;">${c.sent_count || 0}</span></td>
        <td><span style="color:#DC2626; font-weight:600;">${c.failed_count || 0}</span></td>
        <td>${attachmentLabel}</td>
        <td>${statusHtml}</td>
        <td>
          <div style="display:flex; align-items:center;">
            <button class="btn btn-secondary btn-sm" onclick="openCampaignLogsModal(${c.id}, '${escapeHtml(c.title).replace(/'/g, "\\'")}')">
              <i class="fa-solid fa-list"></i> Logs
            </button>
            ${stopBtn}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

async function stopRunningCampaign() {
  if (!confirm('Are you sure you want to STOP the running broadcast immediately?\n\nNo further messages will be sent to the remaining students.')) {
    return;
  }
  try {
    const res = await fetch('/api/campaigns/stop', { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      alert('Broadcast stopped immediately! No further messages will be sent.');
      if (elements.campaignProgressTitle) {
        elements.campaignProgressTitle.textContent = '🛑 Broadcast Stopped by User';
        elements.campaignProgressTitle.style.color = '#DC2626';
      }
      if (elements.campaignStatusBadge) elements.campaignStatusBadge.style.display = 'none';
      if (elements.btnEmergencyStopCampaign) elements.btnEmergencyStopCampaign.style.display = 'none';
      if (elements.btnNavbarStopBroadcast) elements.btnNavbarStopBroadcast.style.display = 'none';
      setTimeout(() => {
        if (elements.campaignProgressBox) elements.campaignProgressBox.style.display = 'none';
      }, 3000);
      fetchCampaigns();
    } else {
      alert('Error stopping broadcast: ' + (data.error || 'Server error'));
    }
  } catch (err) {
    alert('Failed to stop broadcast: ' + err.message);
  }
}
window.stopRunningCampaign = stopRunningCampaign;

function updateLeadAudienceCount() {
  if (!state.leads || state.leads.length === 0) {
    if (elements.campaignLeadCount) elements.campaignLeadCount.textContent = '0';
    return;
  }
  const cat = elements.campaignLeadCategory?.value || 'All';
  const st = elements.campaignLeadStatus?.value || 'All';

  const matches = state.leads.filter(l => {
    const matchCat = cat === 'All' || l.category === cat;
    const matchSt = st === 'All' || l.status === st;
    return matchCat && matchSt;
  });

  if (elements.campaignLeadCount) elements.campaignLeadCount.textContent = matches.length;
}

function updateFacultyAudienceCount() {
  if (!state.faculties || state.faculties.length === 0) {
    if (elements.campaignFacultyCount) elements.campaignFacultyCount.textContent = '0';
    return;
  }
  const dept = elements.campaignFacultyDept?.value || '';
  const college = (elements.campaignFacultyCollege?.value || '').toLowerCase().trim();

  const matches = state.faculties.filter(f => {
    const matchDept = !dept || dept === 'All' || f.department === dept;
    const matchCollege = !college || (f.college_name && f.college_name.toLowerCase().includes(college));
    return matchDept && matchCollege;
  });

  if (elements.campaignFacultyCount) elements.campaignFacultyCount.textContent = matches.length;
}

function handleCampaignFileUpload(file) {
  if (!file) {
    state.selectedCampaignFile = null;
    elements.campaignFileInfo.textContent = 'No file chosen (Accepts .pdf, .jpg, .jpeg, .png up to 25MB)';
    elements.btnRemoveAttachment.style.display = 'none';
    return;
  }

  const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
  if (!validTypes.includes(file.type)) {
    alert('Please select a valid PDF, JPEG, or PNG file.');
    elements.campaignFileInput.value = '';
    return;
  }

  if (file.size > 25 * 1024 * 1024) {
    alert('File size exceeds 25MB limit.');
    elements.campaignFileInput.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    state.selectedCampaignFile = {
      dataUrl: reader.result,
      fileName: file.name,
      mimeType: file.type
    };
    elements.campaignFileInfo.innerHTML = `<strong>${escapeHtml(file.name)}</strong> (${(file.size / (1024 * 1024)).toFixed(2)} MB)`;
    elements.btnRemoveAttachment.style.display = 'inline-block';
  };
  reader.readAsDataURL(file);
}

async function submitCustomCampaign(e) {
  if (e) e.preventDefault();

  const title = elements.campaignTitle.value.trim();
  const audienceType = elements.campaignAudienceType.value;
  const message = elements.campaignMessage.value.trim();

  if (!title) {
    alert('Please enter a campaign title.');
    return;
  }
  if (!message) {
    alert('Please write message content.');
    return;
  }

  let numbers = [];
  let recipients = [];
  let leadCategory = null;
  let leadStatus = null;
  let facultyDepartment = null;
  let facultyCollege = null;

  if (audienceType === 'custom') {
    const raw = elements.campaignCustomNumbers.value.trim();
    if (!raw) {
      alert('Please enter at least one recipient WhatsApp number.');
      return;
    }
    numbers = raw.split(/[\n,;]+/).map(n => n.trim()).filter(n => n.length > 0);
    if (numbers.length === 0) {
      alert('No valid numbers found in the text box.');
      return;
    }
  } else if (audienceType === 'excel') {
    if (!state.excelContacts || state.excelContacts.length === 0) {
      alert('Please upload an Excel or CSV file with valid student contacts first.');
      return;
    }
    recipients = state.excelContacts;
  } else if (audienceType === 'leads') {
    leadCategory = elements.campaignLeadCategory.value;
    leadStatus = elements.campaignLeadStatus.value;
  } else if (audienceType === 'faculties') {
    facultyDepartment = elements.campaignFacultyDept?.value || 'All';
    facultyCollege = elements.campaignFacultyCollege?.value.trim() || '';
  }

  if (!confirm(`Are you sure you want to launch broadcast campaign "${title}"?`)) {
    return;
  }

  elements.btnLaunchCampaign.disabled = true;
  elements.btnLaunchCampaign.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Launching...';

  try {
    const payload = {
      title,
      audienceType,
      numbers,
      recipients,
      leadCategory,
      leadStatus,
      facultyDepartment,
      facultyCollege,
      message,
      speedMode: elements.campaignSpeedMode?.value || 'safe',
      attachment: state.selectedCampaignFile
    };

    const res = await fetch('/api/campaigns/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (data.success) {
      alert(`Broadcast started! Dispatching to ${data.total} recipients with anti-ban throttling.`);
      elements.formCreateCampaign.reset();
      state.selectedCampaignFile = null;
      if (elements.campaignFileInfo) elements.campaignFileInfo.textContent = 'No file chosen (Accepts .pdf, .jpg, .jpeg, .png up to 25MB)';
      if (elements.btnRemoveAttachment) elements.btnRemoveAttachment.style.display = 'none';
      if (audienceType === 'excel') {
        removeExcelFile();
      }
      if (elements.campaignStatusBadge) elements.campaignStatusBadge.style.display = 'inline-block';
      fetchCampaigns();
    } else {
      alert('Failed to launch campaign: ' + (data.error || 'Unknown error'));
    }
  } catch (err) {
    console.error('Campaign launch error:', err);
    alert('Network error launching campaign: ' + err.message);
  } finally {
    elements.btnLaunchCampaign.disabled = false;
    elements.btnLaunchCampaign.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Launch Broadcast Campaign';
  }
}

window.openCampaignLogsModal = async function(campaignId, title) {
  elements.campaignLogsModalTitle.innerHTML = `<i class="fa-solid fa-list-check"></i> Delivery Logs: ${escapeHtml(title)}`;
  elements.campaignLogsTableBody.innerHTML = '<tr><td colspan="5" class="text-center">Loading delivery logs...</td></tr>';
  elements.modalCampaignLogs.classList.add('active');

  try {
    const res = await fetch(`/api/campaigns/${campaignId}/logs`);
    const logs = await res.json();

    if (!logs || logs.length === 0) {
      elements.campaignLogsTableBody.innerHTML = '<tr><td colspan="5" class="empty-state">No delivery logs recorded yet.</td></tr>';
      return;
    }

    elements.campaignLogsTableBody.innerHTML = logs.map(l => {
      const statusPill = l.status === 'sent'
        ? '<span class="status-pill status-enrolled">Sent</span>'
        : '<span class="status-pill status-lost">Failed</span>';
      return `
        <tr>
          <td><strong>${escapeHtml(l.recipient_name || 'Candidate')}</strong></td>
          <td>${escapeHtml(l.recipient_phone)}</td>
          <td>${statusPill}</td>
          <td>${formatIndianDateTime(l.sent_at)}</td>
          <td><small style="color:${l.status === 'failed' ? '#DC2626' : 'var(--text-secondary)'};">${escapeHtml(l.error_message || '—')}</small></td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    elements.campaignLogsTableBody.innerHTML = `<tr><td colspan="5" style="color:#DC2626;">Error loading logs: ${err.message}</td></tr>`;
  }
};

function closeCampaignLogsModal() {
  elements.modalCampaignLogs.classList.remove('active');
}

// ----------------------------------------------------
// INSTITUTIONAL & WORKSHOPS MODULE
// ----------------------------------------------------

async function loadInstitutionsData() {
  await fetchInstitutions();
}

async function fetchInstitutions() {
  try {
    const res = await fetch('/api/institutions');
    if (!res.ok) return;
    const data = await res.json();
    state.institutions = data;
    renderInstitutions(data);
  } catch (err) {
    console.error('Failed to fetch institutions:', err);
  }
}

function renderInstitutions(institutions) {
  let total = institutions.length;
  let mou = 0;
  let scheduled = 0;
  let students = 0;

  institutions.forEach(i => {
    if (i.status === 'MoU Signed') mou++;
    if (i.status === 'Scheduled') scheduled++;
    students += (parseInt(i.estimated_students) || 0);
  });

  if (elements.statInstTotal) elements.statInstTotal.textContent = total;
  if (elements.statInstMou) elements.statInstMou.textContent = mou;
  if (elements.statInstScheduled) elements.statInstScheduled.textContent = scheduled;
  if (elements.statInstStudents) elements.statInstStudents.textContent = students;

  const search = (elements.instSearchInput?.value || '').toLowerCase();
  const filterStatus = elements.instStatusFilter?.value || 'All';

  const filtered = institutions.filter(i => {
    const matchStatus = filterStatus === 'All' || i.status === filterStatus;
    const matchSearch = !search ||
      (i.college_name && i.college_name.toLowerCase().includes(search)) ||
      (i.faculty_contact && i.faculty_contact.toLowerCase().includes(search)) ||
      (i.workshop_topic && i.workshop_topic.toLowerCase().includes(search));
    return matchStatus && matchSearch;
  });

  if (!filtered || filtered.length === 0) {
    elements.institutionsTableBody.innerHTML = '<tr><td colspan="9" class="empty-state">No institutional inquiries found.</td></tr>';
    return;
  }

  elements.institutionsTableBody.innerHTML = filtered.map(i => {
    let statusClass = 'status-inquiry';
    if (i.status === 'Proposal Sent') statusClass = 'status-proposal';
    if (i.status === 'MoU Signed') statusClass = 'status-mou';
    if (i.status === 'Scheduled') statusClass = 'status-scheduled';
    if (i.status === 'Completed') statusClass = 'status-enrolled';

    return `
      <tr>
        <td><strong>${escapeHtml(i.college_name)}</strong></td>
        <td>${escapeHtml(i.faculty_contact)}</td>
        <td>${escapeHtml(i.phone)}</td>
        <td>${escapeHtml(i.department || '—')}</td>
        <td>${escapeHtml(i.workshop_topic || 'Hands-on Biotechnology')}</td>
        <td>${i.estimated_students || '—'}</td>
        <td>${escapeHtml(i.preferred_dates || '—')}</td>
        <td>
          <select class="status-pill ${statusClass}" style="border:none; cursor:pointer;" onchange="updateInstitutionStatus(${i.id}, this.value)">
            <option value="Inquiry" ${i.status === 'Inquiry' ? 'selected' : ''}>Inquiry</option>
            <option value="Proposal Sent" ${i.status === 'Proposal Sent' ? 'selected' : ''}>Proposal Sent</option>
            <option value="MoU Signed" ${i.status === 'MoU Signed' ? 'selected' : ''}>MoU Signed</option>
            <option value="Scheduled" ${i.status === 'Scheduled' ? 'selected' : ''}>Scheduled</option>
            <option value="Completed" ${i.status === 'Completed' ? 'selected' : ''}>Completed</option>
          </select>
        </td>
        <td>
          <button class="btn btn-secondary btn-sm" onclick="sendWorkshopProposal(${i.id}, '${escapeHtml(i.college_name).replace(/'/g, "\\'")}')" title="Send WhatsApp Workshop Proposal">
            <i class="fa-brands fa-whatsapp" style="color:#25D366;"></i> Proposal
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function openAddInstitutionModal() {
  elements.formAddInstitution.reset();
  elements.modalAddInstitution.classList.add('active');
}

function closeAddInstitutionModal() {
  elements.modalAddInstitution.classList.remove('active');
}

async function submitInstitution(e) {
  if (e) e.preventDefault();

  const collegeName = elements.instCollegeName.value.trim();
  const facultyContact = elements.instFacultyName.value.trim();
  const phone = elements.instPhone.value.trim();
  const department = elements.instDepartment.value.trim();
  const workshopTopic = elements.instWorkshopTopic.value.trim();
  const estimatedStudents = elements.instEstimatedStudents.value;
  const preferredDates = elements.instPreferredDate.value.trim();
  const status = elements.instStatus.value;
  const notes = elements.instNotes.value.trim();

  if (!collegeName || !facultyContact || !phone) {
    alert('Please fill College Name, Faculty Contact, and Contact Number.');
    return;
  }

  try {
    const res = await fetch('/api/institutions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        collegeName, facultyContact, phone, department, workshopTopic,
        estimatedStudents, preferredDates, status, notes
      })
    });

    if (res.ok) {
      closeAddInstitutionModal();
      await fetchInstitutions();
    } else {
      alert('Failed to save institution inquiry.');
    }
  } catch (err) {
    console.error('Error adding institution:', err);
    alert('Error saving institution: ' + err.message);
  }
}

window.updateInstitutionStatus = async function(id, newStatus) {
  try {
    const res = await fetch(`/api/institutions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    if (res.ok) {
      await fetchInstitutions();
    }
  } catch (err) {
    console.error('Error updating status:', err);
  }
};

window.sendWorkshopProposal = async function(id, collegeName) {
  if (!confirm(`Send official WhatsApp workshop proposal to faculty coordinator of ${collegeName}?`)) {
    return;
  }

  try {
    const res = await fetch(`/api/institutions/${id}/send-proposal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await res.json();
    if (data.success) {
      alert(`Workshop proposal sent successfully to ${data.sentTo}!`);
      await fetchInstitutions();
    } else {
      alert('Failed to send proposal: ' + (data.error || 'Unknown error'));
    }
  } catch (err) {
    alert('Error sending proposal: ' + err.message);
  }
};

// ----------------------------------------------------
// COLLEGE FACULTY DIRECTORY MODULE
// ----------------------------------------------------

async function loadFacultiesData() {
  await fetchFaculties();
}

async function fetchFaculties() {
  try {
    const params = new URLSearchParams();
    if (state.facultyFilters.search) params.set('search', state.facultyFilters.search);
    if (state.facultyFilters.department) params.set('department', state.facultyFilters.department);

    const res = await fetch('/api/faculties?' + params.toString());
    if (!res.ok) return;
    const data = await res.json();
    state.faculties = data;
    renderFaculties(data);
    updateFacultyAudienceCount();
  } catch (err) {
    console.error('Failed to fetch faculties:', err);
  }
}

function renderFaculties(faculties) {
  const total = faculties.length;
  const collegesSet = new Set();
  let biotechCount = 0;

  faculties.forEach(f => {
    if (f.college_name) collegesSet.add(f.college_name.trim().toLowerCase());
    const dept = (f.department || '').toLowerCase();
    if (dept.includes('biotech') || dept.includes('life sci') || dept.includes('microbio') || dept.includes('biochem')) {
      biotechCount++;
    }
  });

  if (elements.statTotalFaculties) elements.statTotalFaculties.textContent = total;
  if (elements.statFacultyColleges) elements.statFacultyColleges.textContent = collegesSet.size;
  if (elements.statFacultyBiotech) elements.statFacultyBiotech.textContent = biotechCount;

  if (!faculties || faculties.length === 0) {
    elements.facultiesTableBody.innerHTML = '<tr><td colspan="9" class="empty-state">No faculty contacts found. Click "+ Add Faculty Contact" above to register college professors.</td></tr>';
    return;
  }

  elements.facultiesTableBody.innerHTML = faculties.map(f => {
    const cleanPhone = (f.phone || '').replace(/[^0-9]/g, '');
    const waLink = `https://wa.me/${cleanPhone}`;

    return `
      <tr>
        <td><strong>${escapeHtml(f.faculty_name)}</strong></td>
        <td>${escapeHtml(f.designation || 'Faculty')}</td>
        <td><strong>${escapeHtml(f.college_name)}</strong></td>
        <td>${escapeHtml(f.department || '—')}</td>
        <td>
          <a href="${waLink}" target="_blank" style="color:#25D366; text-decoration:none; font-weight:600;">
            <i class="fa-brands fa-whatsapp"></i> ${escapeHtml(f.phone)}
          </a>
        </td>
        <td>${f.email ? `<a href="mailto:${escapeHtml(f.email)}" style="color:var(--text-secondary); text-decoration:none;">${escapeHtml(f.email)}</a>` : '—'}</td>
        <td>${escapeHtml([f.city, f.state].filter(Boolean).join(', ') || '—')}</td>
        <td><small style="color:var(--text-secondary);">${escapeHtml(f.notes || '—')}</small></td>
        <td>
          <div style="display:flex; gap:6px;">
            <button class="btn btn-secondary btn-sm" onclick="editFaculty(${f.id})" title="Edit Faculty">
              <i class="fa-solid fa-pen-to-square"></i>
            </button>
            <button class="btn btn-outline btn-sm" style="color:#DC2626; border-color:#DC2626;" onclick="deleteFaculty(${f.id}, '${escapeHtml(f.faculty_name).replace(/'/g, "\\'")}')" title="Delete Faculty">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function openAddFacultyModal(id = null) {
  const form = elements.formAddFaculty || document.getElementById('formAddFaculty');
  if (form) form.reset();
  const editId = elements.facEditId || document.getElementById('facEditId');
  if (editId) editId.value = '';

  const title = elements.facultyModalTitle || document.getElementById('facultyModalTitle');

  if (id) {
    const f = state.faculties.find(item => item.id === id);
    if (f) {
      if (editId) editId.value = f.id;
      const setVal = (el, val) => { if (el) el.value = val || ''; };
      setVal(elements.facName || document.getElementById('facName'), f.faculty_name);
      setVal(elements.facDesignation || document.getElementById('facDesignation'), f.designation);
      setVal(elements.facCollege || document.getElementById('facCollege'), f.college_name);
      setVal(elements.facDepartment || document.getElementById('facDepartment'), f.department);
      setVal(elements.facPhone || document.getElementById('facPhone'), f.phone);
      setVal(elements.facEmail || document.getElementById('facEmail'), f.email);
      setVal(elements.facCity || document.getElementById('facCity'), f.city);
      setVal(elements.facNotes || document.getElementById('facNotes'), f.notes);
      if (title) {
        title.innerHTML = '<i class="fa-solid fa-chalkboard-user"></i> Edit College Faculty Contact';
      }
    }
  } else {
    if (title) {
      title.innerHTML = '<i class="fa-solid fa-chalkboard-user"></i> Add College Faculty Contact';
    }
  }

  const modal = elements.modalAddFaculty || document.getElementById('modalAddFaculty');
  if (modal) {
    modal.classList.add('active');
    modal.style.display = 'flex';
  }
}
window.openAddFacultyModal = openAddFacultyModal;

function closeAddFacultyModal() {
  const modal = elements.modalAddFaculty || document.getElementById('modalAddFaculty');
  if (modal) {
    modal.classList.remove('active');
    modal.style.display = 'none';
  }
}
window.closeAddFacultyModal = closeAddFacultyModal;

async function saveFaculty(e) {
  if (e) e.preventDefault();
  if (state.isSavingFaculty) return;
  state.isSavingFaculty = true;

  const submitBtn = elements.btnSubmitFaculty || document.getElementById('btnSubmitFaculty');
  const originalHtml = submitBtn ? submitBtn.innerHTML : '';
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
  }

  const editId = elements.facEditId || document.getElementById('facEditId');
  const facName = elements.facName || document.getElementById('facName');
  const facDesignation = elements.facDesignation || document.getElementById('facDesignation');
  const facCollege = elements.facCollege || document.getElementById('facCollege');
  const facDepartment = elements.facDepartment || document.getElementById('facDepartment');
  const facPhone = elements.facPhone || document.getElementById('facPhone');
  const facEmail = elements.facEmail || document.getElementById('facEmail');
  const facCity = elements.facCity || document.getElementById('facCity');
  const facNotes = elements.facNotes || document.getElementById('facNotes');

  const id = editId ? editId.value : '';
  const faculty_name = facName ? facName.value.trim() : '';
  const designation = facDesignation ? facDesignation.value.trim() : '';
  const college_name = facCollege ? facCollege.value.trim() : '';
  const department = facDepartment ? facDepartment.value.trim() : '';
  const phone = facPhone ? facPhone.value.trim() : '';
  const email = facEmail ? facEmail.value.trim() : '';
  const city = facCity ? facCity.value.trim() : '';
  const notes = facNotes ? facNotes.value.trim() : '';

  if (!faculty_name || !college_name || !phone) {
    alert('Please fill Faculty Name, College / University, and WhatsApp Number.');
    state.isSavingFaculty = false;
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalHtml;
    }
    return;
  }

  const payload = { faculty_name, designation, college_name, department, phone, email, city, notes };

  try {
    const url = id ? `/api/faculties/${id}` : '/api/faculties';
    const method = id ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (res.ok && data.success) {
      closeAddFacultyModal();
      await fetchFaculties();
      alert(id ? 'Faculty contact updated successfully!' : 'Faculty contact added successfully!');
    } else {
      alert('Failed to save faculty contact: ' + (data.error || 'Unknown error'));
    }
  } catch (err) {
    console.error('Error saving faculty:', err);
    alert('Error saving faculty: ' + err.message);
  } finally {
    state.isSavingFaculty = false;
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalHtml;
    }
  }
}
window.saveFaculty = saveFaculty;

function editFaculty(id) {
  openAddFacultyModal(id);
}
window.editFaculty = editFaculty;

async function deleteFaculty(id, name) {
  if (!confirm(`Are you sure you want to delete faculty contact "${name}"?`)) {
    return;
  }

  try {
    const res = await fetch(`/api/faculties/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (res.ok && data.success) {
      await fetchFaculties();
    } else {
      alert('Failed to delete faculty contact: ' + (data.error || 'Unknown error'));
    }
  } catch (err) {
    console.error('Error deleting faculty:', err);
    alert('Error deleting faculty: ' + err.message);
  }
}
window.deleteFaculty = deleteFaculty;

// ----------------------------------------------------
// SETTINGS: MORNING DIGEST & GOOGLE SHEETS
// ----------------------------------------------------

async function saveDigestConfig(e) {
  if (e) e.preventDefault();
  try {
    const payload = {
      STAFF_PHONE: elements.cfgStaffPhone.value.trim(),
      COUNSELOR_PHONE: elements.cfgCounselorPhone.value.trim(),
      DIRECTOR_PHONE: elements.cfgDirectorPhone.value.trim(),
      DIGEST_TIME: elements.cfgDigestTime.value.trim(),
      DIGEST_ENABLED: elements.cfgDigestEnabled.value
    };
    const res = await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      if (elements.digestStatusBadge) {
        elements.digestStatusBadge.textContent = (payload.DIGEST_ENABLED === '1' ? payload.DIGEST_TIME + ' IST' : 'Disabled');
      }
      alert('Morning digest settings saved successfully!');
    } else {
      alert('Failed to save digest settings.');
    }
  } catch (err) {
    console.error('Error saving digest config:', err);
    alert('Error saving digest settings: ' + err.message);
  }
}

async function sendMorningDigestNow() {
  if (!confirm('Send Daily Team Morning Digest to Staff, Counselor, and Director now?')) {
    return;
  }

  elements.digestActionStatus.textContent = 'Sending digest...';
  elements.digestActionStatus.style.color = 'var(--primary-dark)';

  try {
    const res = await fetch('/api/digest/send-now', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await res.json();
    if (data.success) {
      elements.digestActionStatus.textContent = `Digest sent to ${data.recipients} recipients!`;
      elements.digestActionStatus.style.color = '#059669';
    } else {
      elements.digestActionStatus.textContent = 'Failed: ' + (data.error || 'Check team phone numbers in settings');
      elements.digestActionStatus.style.color = '#DC2626';
    }
  } catch (err) {
    elements.digestActionStatus.textContent = 'Error: ' + err.message;
    elements.digestActionStatus.style.color = '#DC2626';
  }
}

async function saveGoogleSheetConfig(e) {
  if (e) e.preventDefault();
  try {
    const payload = {
      GOOGLE_SHEET_URL: elements.cfgGoogleSheetUrl.value.trim()
    };
    const res = await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      alert('Google Sheet Webhook URL saved successfully!');
    } else {
      alert('Failed to save Google Sheet URL.');
    }
  } catch (err) {
    console.error('Error saving sheet config:', err);
    alert('Error saving Google Sheet config: ' + err.message);
  }
}

async function syncAllLeadsToGoogleSheet() {
  const url = elements.cfgGoogleSheetUrl.value.trim();
  if (!url) {
    alert('Please enter and save a Google Apps Script Webhook URL first.');
    return;
  }

  elements.sheetSyncStatus.textContent = 'Syncing leads...';
  elements.sheetSyncStatus.style.color = 'var(--primary-dark)';

  try {
    const res = await fetch('/api/sync/google-sheets/all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await res.json();
    if (data.success) {
      elements.sheetSyncStatus.textContent = `Synced ${data.synced} leads to Google Sheet!`;
      elements.sheetSyncStatus.style.color = '#059669';
    } else {
      elements.sheetSyncStatus.textContent = 'Sync failed: ' + (data.error || 'Check webhook URL');
      elements.sheetSyncStatus.style.color = '#DC2626';
    }
  } catch (err) {
    elements.sheetSyncStatus.textContent = 'Error: ' + err.message;
    elements.sheetSyncStatus.style.color = '#DC2626';
  }
}

// ----------------------------------------------------
// LOCAL NETWORK ACCESS & GOOGLE DRIVE CLOUD BACKUP
// ----------------------------------------------------

async function fetchNetworkInfo() {
  try {
    const res = await fetch('/api/network-info');
    if (!res.ok) return;
    const data = await res.json();
    if (data.networkUrl) {
      if (elements.networkAccessLink) {
        elements.networkAccessLink.value = data.networkUrl;
      }
      if (elements.navbarNetworkText) {
        elements.navbarNetworkText.textContent = data.networkUrl.replace('http://', '');
      }
      if (elements.btnOpenNetworkLink) {
        elements.btnOpenNetworkLink.href = data.networkUrl;
      }
    }
  } catch (err) {
    console.error('Failed to fetch network info:', err);
  }
}

function copyNetworkLink() {
  const url = elements.networkAccessLink ? elements.networkAccessLink.value : '';
  if (!url) return;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).then(() => {
      alert('Local Wi-Fi Network URL copied!\n\nOpen this link on any computer, laptop, iPad, or mobile phone on the same Wi-Fi:\n' + url);
    }).catch(() => {
      prompt('Copy this link to access from any device on your Wi-Fi:', url);
    });
  } else {
    prompt('Copy this link to access from any device on your Wi-Fi:', url);
  }
}

async function fetchBackupStatus() {
  try {
    const res = await fetch('/api/backup/status');
    if (!res.ok) return;
    const data = await res.json();
    if (elements.cfgGoogleDriveUrl && data.googleDriveUrl) {
      elements.cfgGoogleDriveUrl.value = data.googleDriveUrl;
    }
    if (elements.lblLastBackupTime) {
      elements.lblLastBackupTime.textContent = data.lastBackupTime || 'Never';
    }
    if (elements.gdriveBackupStatusBadge) {
      if (data.googleDriveUrl) {
        elements.gdriveBackupStatusBadge.textContent = 'Configured';
        elements.gdriveBackupStatusBadge.style.background = '#D1FAE5';
        elements.gdriveBackupStatusBadge.style.color = '#065F46';
      } else {
        elements.gdriveBackupStatusBadge.textContent = 'Not Set';
        elements.gdriveBackupStatusBadge.style.background = '#F3F4F6';
        elements.gdriveBackupStatusBadge.style.color = '#4B5563';
      }
    }
    if (elements.btnOpenGoogleDriveFolder) {
      if (data.googleDriveUrl) {
        elements.btnOpenGoogleDriveFolder.href = data.googleDriveUrl;
        elements.btnOpenGoogleDriveFolder.style.pointerEvents = 'auto';
        elements.btnOpenGoogleDriveFolder.style.opacity = '1';
      } else {
        elements.btnOpenGoogleDriveFolder.removeAttribute('href');
        elements.btnOpenGoogleDriveFolder.style.pointerEvents = 'none';
        elements.btnOpenGoogleDriveFolder.style.opacity = '0.5';
      }
    }
  } catch (err) {
    console.error('Failed to fetch backup status:', err);
  }
}

async function handleSaveGoogleDriveUrl(e) {
  if (e && e.preventDefault) e.preventDefault();
  const url = elements.cfgGoogleDriveUrl ? elements.cfgGoogleDriveUrl.value.trim() : '';
  if (!url) {
    alert('Please enter a valid Google Drive folder or file URL.');
    return;
  }
  try {
    const res = await fetch('/api/backup/save-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ googleDriveUrl: url })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      alert('Google Drive Link saved successfully! It is stored permanently in the database.');
      fetchBackupStatus();
    } else {
      alert('Failed to save Google Drive link: ' + (data.error || 'Unknown error'));
    }
  } catch (err) {
    alert('Error saving Google Drive link: ' + err.message);
  }
}

async function handleTriggerCloudBackup() {
  const gdriveUrl = elements.cfgGoogleDriveUrl ? elements.cfgGoogleDriveUrl.value.trim() : '';
  if (!elements.backupActionStatus) return;
  elements.backupActionStatus.style.display = 'block';
  elements.backupActionStatus.textContent = 'Generating database export snapshot...';

  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `helix_crm_backup_${timestamp}.json`;

    // Download the full JSON export snapshot
    const downloadUrl = '/api/backup/export';
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    elements.backupActionStatus.textContent = 'Backup file downloaded successfully! Opening your Google Drive folder for upload...';

    if (elements.lblLastBackupTime) {
      elements.lblLastBackupTime.textContent = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    }

    if (gdriveUrl) {
      setTimeout(() => {
        window.open(gdriveUrl, '_blank');
        elements.backupActionStatus.textContent = 'Backup downloaded! Upload it to your opened Google Drive folder.';
      }, 1500);
    } else {
      elements.backupActionStatus.textContent = 'Backup downloaded! Add a Google Drive link above to open it automatically next time.';
    }
  } catch (err) {
    elements.backupActionStatus.textContent = 'Backup error: ' + err.message;
  }
}

// ----------------------------------------------------
// OFFICIAL INFORMATION BROCHURE (PDF) MODULE
// ----------------------------------------------------

let selectedBrochureFileBase64 = null;

function formatBytes(bytes, decimals = 2) {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

async function fetchBrochureDetails() {
  try {
    const res = await fetch('/api/bot/brochure');
    if (!res.ok) return;
    const data = await res.json();
    if (data.exists) {
      if (elements.brochureStatusBadge) {
        elements.brochureStatusBadge.textContent = 'Active (Ready)';
        elements.brochureStatusBadge.className = 'status-pill status-enrolled';
      }
      if (elements.brochureFileName) elements.brochureFileName.textContent = data.fileName;
      if (elements.brochureFileSize) elements.brochureFileSize.textContent = formatBytes(data.fileSize);
      if (elements.brochureLastModified) elements.brochureLastModified.textContent = formatIndianDateTime(data.lastModified);
      if (elements.btnViewBrochure) elements.btnViewBrochure.style.display = 'inline-flex';
    } else {
      if (elements.brochureStatusBadge) {
        elements.brochureStatusBadge.textContent = 'Not Uploaded';
        elements.brochureStatusBadge.className = 'status-pill status-lost';
      }
      if (elements.brochureFileSize) elements.brochureFileSize.textContent = 'None';
      if (elements.brochureLastModified) elements.brochureLastModified.textContent = 'None';
      if (elements.btnViewBrochure) elements.btnViewBrochure.style.display = 'none';
    }
  } catch (err) {
    console.error('Failed to fetch brochure details:', err);
  }
}

function handleBrochureFileSelect(e) {
  const file = e.target.files[0];
  if (!file) return;

  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    alert('Please select a valid PDF document (.pdf).');
    elements.brochureFileInput.value = '';
    elements.selectedBrochureFileName.textContent = 'No file chosen (PDF up to 25MB)';
    elements.btnUploadBrochureSubmit.disabled = true;
    selectedBrochureFileBase64 = null;
    return;
  }

  if (file.size > 25 * 1024 * 1024) {
    alert('File size exceeds 25MB limit. Please select a smaller PDF.');
    elements.brochureFileInput.value = '';
    elements.selectedBrochureFileName.textContent = 'No file chosen (PDF up to 25MB)';
    elements.btnUploadBrochureSubmit.disabled = true;
    selectedBrochureFileBase64 = null;
    return;
  }

  elements.selectedBrochureFileName.textContent = `${file.name} (${formatBytes(file.size)})`;
  elements.btnUploadBrochureSubmit.disabled = false;

  const reader = new FileReader();
  reader.onload = (loadEvt) => {
    selectedBrochureFileBase64 = loadEvt.target.result;
  };
  reader.readAsDataURL(file);
}

async function handleBrochureUploadSubmit(e) {
  e.preventDefault();
  if (!selectedBrochureFileBase64) {
    alert('Please choose a PDF file first.');
    return;
  }

  elements.btnUploadBrochureSubmit.disabled = true;
  elements.brochureUploadStatus.textContent = 'Uploading brochure...';
  elements.brochureUploadStatus.style.color = 'var(--primary-dark)';

  try {
    const res = await fetch('/api/bot/brochure/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileData: selectedBrochureFileBase64,
        fileName: 'Helix_BioFast_Information_Brochure.pdf'
      })
    });

    const data = await res.json();
    if (res.ok && data.success) {
      elements.brochureUploadStatus.textContent = 'Uploaded successfully!';
      elements.brochureUploadStatus.style.color = '#059669';
      alert('Official Information Brochure PDF uploaded and replaced successfully!');
      elements.brochureFileInput.value = '';
      elements.selectedBrochureFileName.textContent = 'No file chosen (PDF up to 25MB)';
      selectedBrochureFileBase64 = null;
      await fetchBrochureDetails();
      setTimeout(() => {
        if (elements.brochureUploadStatus) elements.brochureUploadStatus.textContent = '';
      }, 4000);
    } else {
      elements.brochureUploadStatus.textContent = 'Upload failed: ' + (data.error || 'Unknown error');
      elements.brochureUploadStatus.style.color = '#DC2626';
      elements.btnUploadBrochureSubmit.disabled = false;
    }
  } catch (err) {
    console.error('Brochure upload error:', err);
    elements.brochureUploadStatus.textContent = 'Error: ' + err.message;
    elements.brochureUploadStatus.style.color = '#DC2626';
    elements.btnUploadBrochureSubmit.disabled = false;
  }
}

async function handleTestSendBrochure(e) {
  e.preventDefault();
  const phone = elements.testBrochurePhone.value.trim();
  if (!phone) {
    alert('Please enter a recipient 10-digit WhatsApp number.');
    return;
  }

  elements.btnTestSendBrochure.disabled = true;
  elements.testBrochureStatus.textContent = 'Sending brochure...';
  elements.testBrochureStatus.style.color = 'var(--primary-dark)';

  try {
    const res = await fetch('/api/bot/brochure/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone })
    });

    const data = await res.json();
    if (res.ok && data.success) {
      elements.testBrochureStatus.textContent = 'Brochure sent successfully!';
      elements.testBrochureStatus.style.color = '#059669';
      alert(`Official Information Brochure PDF sent successfully to ${phone}!`);
      setTimeout(() => {
        if (elements.testBrochureStatus) elements.testBrochureStatus.textContent = '';
      }, 4000);
    } else {
      elements.testBrochureStatus.textContent = 'Failed: ' + (data.error || 'Unknown error');
      elements.testBrochureStatus.style.color = '#DC2626';
    }
  } catch (err) {
    elements.testBrochureStatus.textContent = 'Error: ' + err.message;
    elements.testBrochureStatus.style.color = '#DC2626';
  } finally {
    elements.btnTestSendBrochure.disabled = false;
  }
}

async function handleSendChatBrochure() {
  if (!state.selectedChatId) {
    alert('Please select a student conversation from the left thread list first.');
    return;
  }

  const currentChat = state.chats.find(c => c.chat_id === state.selectedChatId);
  const studentName = currentChat ? currentChat.name : 'this student';

  if (!confirm(`Send official Information Brochure PDF to ${studentName}?`)) {
    return;
  }

  elements.btnSendChatBrochure.disabled = true;
  const originalBtnHtml = elements.btnSendChatBrochure.innerHTML;
  elements.btnSendChatBrochure.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Sending...';

  try {
    const res = await fetch('/api/bot/brochure/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chatId: state.selectedChatId,
        phone: currentChat?.phone || null
      })
    });

    const data = await res.json();
    if (res.ok && data.success) {
      alert(`Official Information Brochure PDF sent successfully to ${studentName}!`);
      await fetchMessages(state.selectedChatId);
      await fetchChats();
    } else {
      alert('Failed to send brochure: ' + (data.error || 'Check if WhatsApp is connected'));
    }
  } catch (err) {
    alert('Error sending brochure: ' + err.message);
  } finally {
    elements.btnSendChatBrochure.disabled = false;
    elements.btnSendChatBrochure.innerHTML = originalBtnHtml;
  }
}

// ----------------------------------------------------
// WHATSAPP CONTACTS MANAGEMENT
// ----------------------------------------------------

async function loadContactsData() {
  await fetchContactsStats();
  await loadContacts(1);
}

async function fetchContactsStats() {
  try {
    const res = await fetch('/api/contacts/stats');
    const data = await res.json();
    if (elements.statTotalContacts) elements.statTotalContacts.textContent = data.totalContacts || 0;
    if (elements.statSavedContacts) elements.statSavedContacts.textContent = data.savedContacts || 0;
    if (elements.statPhoneContacts) elements.statPhoneContacts.textContent = data.phoneContacts || 0;
  } catch (err) {
    console.error('Failed to fetch contacts stats:', err);
  }
}

async function loadContacts(page = 1) {
  state.contacts.page = page;
  try {
    const params = new URLSearchParams({
      page: state.contacts.page,
      limit: state.contacts.limit,
      search: state.contacts.search,
      filter: state.contacts.filter
    });

    const res = await fetch(`/api/contacts?${params.toString()}`);
    const data = await res.json();
    state.contacts.list = data.contacts || [];
    state.contacts.total = data.total || 0;
    renderContactsTable(state.contacts.list);

    const totalPages = Math.ceil(state.contacts.total / state.contacts.limit) || 1;
    if (elements.contactsPageInfo) {
      elements.contactsPageInfo.textContent = `Page ${state.contacts.page} of ${totalPages} (${state.contacts.total} total)`;
    }
    if (elements.btnContactsPrevPage) {
      elements.btnContactsPrevPage.disabled = state.contacts.page <= 1;
    }
    if (elements.btnContactsNextPage) {
      elements.btnContactsNextPage.disabled = state.contacts.page >= totalPages;
    }
  } catch (err) {
    console.error('Failed to load contacts:', err);
    if (elements.contactsTableBody) {
      elements.contactsTableBody.innerHTML = `<tr><td colspan="6" class="empty-state" style="color: #dc2626;">Error loading contacts: ${err.message}</td></tr>`;
    }
  }
}

function renderContactsTable(contacts) {
  if (!elements.contactsTableBody) return;

  if (!contacts || contacts.length === 0) {
    elements.contactsTableBody.innerHTML = `
      <tr>
        <td colspan="6" class="empty-state">
          No WhatsApp contacts found. Connect WhatsApp to automatically sync your full contacts directory.
        </td>
      </tr>
    `;
    return;
  }

  elements.contactsTableBody.innerHTML = contacts.map(c => {
    const isSaved = c.is_saved === 1;
    const typePill = isSaved
      ? `<span class="status-pill status-enrolled"><i class="fa-solid fa-address-book"></i> Saved Contact</span>`
      : `<span class="status-pill status-new"><i class="fa-solid fa-comment-dots"></i> Chat Only</span>`;

    const displayName = c.name || c.notify || 'Unknown';
    const profilePush = c.notify && c.notify !== c.name ? `<br><small style="color: #6b7280;">Profile: ${escapeHtml(c.notify)}</small>` : '';
    const phoneDisplay = c.phone ? `+${escapeHtml(c.phone)}` : '—';
    const jidShort = escapeHtml(c.jid.replace('@s.whatsapp.net', ''));

    const updatedDate = c.updated_at ? new Date(c.updated_at).toLocaleDateString() : '—';

    return `
      <tr>
        <td>
          <strong>${escapeHtml(displayName)}</strong>
          ${profilePush}
        </td>
        <td><code>${phoneDisplay}</code></td>
        <td><small style="color: #6b7280;">${jidShort}</small></td>
        <td>${typePill}</td>
        <td><small style="color: #6b7280;">${updatedDate}</small></td>
        <td>
          <div style="display: flex; gap: 6px; flex-wrap: wrap;">
            <button class="btn btn-secondary btn-sm" onclick="openChatWithContact('${escapeHtml(c.jid)}', '${escapeHtml(displayName)}', '${escapeHtml(c.phone || '')}')" title="Open or Start Chat in CRM">
              <i class="fa-solid fa-message"></i> Chat
            </button>
            <button class="btn btn-primary btn-sm" onclick="addContactToLeads('${escapeHtml(c.jid)}', '${escapeHtml(displayName)}', '${escapeHtml(c.phone || '')}')" title="Add Contact to Student Leads">
              <i class="fa-solid fa-user-plus"></i> Add Lead
            </button>
            ${c.phone ? `
            <a href="https://wa.me/${c.phone}" target="_blank" class="btn btn-secondary btn-sm" title="Open in Official WhatsApp Web/App">
              <i class="fa-brands fa-whatsapp"></i> Direct
            </a>` : ''}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

async function updateContactsAudienceCount(savedOnly) {
  try {
    const res = await fetch('/api/contacts/stats');
    const data = await res.json();
    const count = savedOnly ? (data.savedContacts || 0) : (data.totalContacts || 0);
    if (elements.campaignContactsCount) {
      elements.campaignContactsCount.textContent = `${count} contacts targeted`;
    }
  } catch (err) {
    console.error('Failed to update contacts audience count:', err);
  }
}

window.openChatWithContact = async function(jid, name, phone) {
  setChatTimeFilter('all');
  switchTab('inbox');
  const chat = state.chats.find(c => c.chat_id === jid);
  if (chat) {
    selectChat(encodeURIComponent(jid));
  } else {
    // Chat doesn't have existing messages yet in DB, set up active view so user can message them
    state.selectedChatId = jid;
    if (elements.noChatSelected) elements.noChatSelected.style.display = 'none';
    if (elements.chatActiveView) elements.chatActiveView.style.display = 'flex';
    if (elements.chatAvatar) elements.chatAvatar.textContent = (name || phone || 'WA').substring(0, 2).toUpperCase();
    if (elements.chatHeaderName) elements.chatHeaderName.textContent = name || phone || jid;
    if (elements.chatHeaderPhone) elements.chatHeaderPhone.textContent = phone ? `+${phone}` : jid;
    if (elements.toggleAutoReply) elements.toggleAutoReply.checked = true;
    if (elements.chatMessagesBody) {
      elements.chatMessagesBody.innerHTML = `
        <div class="empty-chat" style="padding: 40px 20px; text-align: center; color: #6b7280;">
          <i class="fa-brands fa-whatsapp" style="font-size: 36px; color: #25D366; margin-bottom: 12px; display: block;"></i>
          <p style="font-weight: 600; font-size: 15px; color: #111827;">Direct chat with ${escapeHtml(name)}</p>
          <p style="font-size: 13px; margin-top: 4px;">WhatsApp ID: <code>${escapeHtml(jid)}</code></p>
          <p style="font-size: 13px; margin-top: 8px; color: #4b5563;">Type a message below and click Send to start a conversation in WhatsApp.</p>
        </div>
      `;
    }
  }
};

window.addContactToLeads = async function(jid, name, phone) {
  const defaultCategory = 'General Inquiry';
  const category = prompt(`Add "${name}" (${phone ? '+' + phone : jid}) to Student Leads.\nEnter Category (e.g. B.Tech, M.Tech, MBA, General Inquiry):`, defaultCategory);
  if (category === null) return;

  try {
    const res = await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chatId: jid,
        name: name && name !== 'Unknown' ? name : (phone ? `Student ${phone}` : 'Student'),
        phone: phone || '',
        category: category || 'General Inquiry',
        status: 'New',
        notes: `Imported from WhatsApp Contacts (${jid})`
      })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      alert(`Successfully added "${name}" to Student Leads!`);
      await fetchLeads();
      await fetchStats();
    } else {
      alert('Failed to add lead: ' + (data.error || 'Unknown error'));
    }
  } catch (err) {
    alert('Error adding lead: ' + err.message);
  }
};

// ----------------------------------------------------
// EXCEL / CSV CONTACTS UPLOAD FOR CAMPAIGNS
// ----------------------------------------------------

async function handleExcelFileUpload(e) {
  const file = e.target.files?.[0];
  if (!file) return;

  if (typeof XLSX === 'undefined') {
    alert('Excel parser library (SheetJS) is loading. Please try again in a few seconds.');
    return;
  }

  const fileName = file.name;
  if (elements.campaignExcelFileName) {
    elements.campaignExcelFileName.textContent = `${fileName} (${(file.size / 1024).toFixed(1)} KB)`;
  }
  if (elements.btnRemoveExcelFile) {
    elements.btnRemoveExcelFile.style.display = 'inline-flex';
  }

  try {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      alert('The uploaded Excel workbook contains no sheets.');
      removeExcelFile();
      return;
    }

    const worksheet = workbook.Sheets[firstSheetName];
    const rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

    if (!rawRows || rawRows.length === 0) {
      alert('No data rows found in the uploaded sheet. Please make sure the first row contains headers and subsequent rows contain contacts.');
      removeExcelFile();
      return;
    }

    // Extract all unique column headers
    const columns = [];
    rawRows.forEach(row => {
      Object.keys(row).forEach(k => {
        const trimmed = k.trim();
        if (trimmed && !columns.includes(trimmed)) {
          columns.push(trimmed);
        }
      });
    });

    if (columns.length === 0) {
      alert('Could not find any column headers in the uploaded file.');
      removeExcelFile();
      return;
    }

    state.excelRawRows = rawRows;
    state.excelColumns = columns;

    // Populate column dropdowns
    if (elements.excelNameColumn) {
      elements.excelNameColumn.innerHTML = columns.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
    }
    if (elements.excelPhoneColumn) {
      elements.excelPhoneColumn.innerHTML = columns.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
    }

    // Auto-detect Name Column
    const nameKeywords = ['name', 'student name', 'candidate name', 'student', 'candidate', 'full name', 'first name', 'naam'];
    let detectedNameCol = columns.find(c => nameKeywords.includes(c.toLowerCase().trim())) ||
                          columns.find(c => nameKeywords.some(k => c.toLowerCase().includes(k))) ||
                          columns[0];

    // Auto-detect Phone Column
    const phoneKeywords = ['phone', 'mobile', 'whatsapp', 'contact', 'number', 'mobile number', 'phone number', 'cell', 'tel', 'mob'];
    let detectedPhoneCol = columns.find(c => phoneKeywords.includes(c.toLowerCase().trim())) ||
                           columns.find(c => phoneKeywords.some(k => c.toLowerCase().includes(k))) ||
                           (columns.length > 1 ? columns[1] : columns[0]);

    state.excelSelectedNameCol = detectedNameCol;
    state.excelSelectedPhoneCol = detectedPhoneCol;

    if (elements.excelNameColumn) elements.excelNameColumn.value = detectedNameCol;
    if (elements.excelPhoneColumn) elements.excelPhoneColumn.value = detectedPhoneCol;

    if (elements.boxExcelDetails) elements.boxExcelDetails.style.display = 'block';

    processExcelRows();
    renderDynamicPlaceholders();
  } catch (err) {
    console.error('Failed to parse Excel file:', err);
    alert('Error reading Excel/CSV file: ' + err.message);
    removeExcelFile();
  }
}

function removeExcelFile() {
  state.excelContacts = [];
  state.excelColumns = [];
  state.excelRawRows = [];
  state.excelSelectedNameCol = '';
  state.excelSelectedPhoneCol = '';

  if (elements.campaignExcelFileInput) elements.campaignExcelFileInput.value = '';
  if (elements.campaignExcelFileName) elements.campaignExcelFileName.textContent = 'No file chosen yet';
  if (elements.btnRemoveExcelFile) elements.btnRemoveExcelFile.style.display = 'none';
  if (elements.boxExcelDetails) elements.boxExcelDetails.style.display = 'none';
  if (elements.excelPreviewTableBody) elements.excelPreviewTableBody.innerHTML = '';
  if (elements.campaignExcelCount) elements.campaignExcelCount.textContent = '0 contacts loaded';
  if (elements.campaignExcelInvalidCount) elements.campaignExcelInvalidCount.textContent = '';

  renderDynamicPlaceholders();
}

function processExcelRows() {
  const nameCol = elements.excelNameColumn ? elements.excelNameColumn.value : state.excelSelectedNameCol;
  const phoneCol = elements.excelPhoneColumn ? elements.excelPhoneColumn.value : state.excelSelectedPhoneCol;

  if (!state.excelRawRows || state.excelRawRows.length === 0) return;

  const validContacts = [];
  let invalidCount = 0;

  state.excelRawRows.forEach((row, idx) => {
    const rawName = String(row[nameCol] || '').trim();
    const rawPhone = String(row[phoneCol] || '').trim();

    // Clean Indian phone number
    const digitsOnly = rawPhone.replace(/[^0-9]/g, '');
    let cleanPhone = null;

    if (digitsOnly.length === 10) {
      cleanPhone = '91' + digitsOnly;
    } else if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) {
      cleanPhone = digitsOnly;
    } else if (digitsOnly.length > 10 && digitsOnly.startsWith('0')) {
      cleanPhone = '91' + digitsOnly.slice(-10);
    } else if (digitsOnly.length >= 10) {
      cleanPhone = digitsOnly;
    }

    if (cleanPhone && cleanPhone.length >= 10) {
      validContacts.push({
        name: rawName || 'Student',
        phone: cleanPhone,
        rawPhone: rawPhone,
        rowData: row
      });
    } else {
      invalidCount++;
    }
  });

  state.excelContacts = validContacts;

  if (elements.campaignExcelCount) {
    elements.campaignExcelCount.textContent = `${validContacts.length} valid contacts loaded`;
  }
  if (elements.campaignExcelInvalidCount) {
    elements.campaignExcelInvalidCount.textContent = invalidCount > 0 ? `(${invalidCount} invalid/empty numbers skipped)` : '';
  }

  // Render first 5 preview rows
  if (elements.excelPreviewTableBody) {
    const previewRows = validContacts.slice(0, 5);
    if (previewRows.length === 0) {
      elements.excelPreviewTableBody.innerHTML = `
        <tr>
          <td colspan="5" style="padding: 12px; text-align: center; color: #DC2626;">
            No valid contacts found. Please check that the selected Phone Number column contains 10-digit mobile numbers.
          </td>
        </tr>
      `;
    } else {
      elements.excelPreviewTableBody.innerHTML = previewRows.map((c, i) => `
        <tr>
          <td style="padding: 6px 10px; border-bottom: 1px solid #E2E8F0;">${i + 1}</td>
          <td style="padding: 6px 10px; border-bottom: 1px solid #E2E8F0;"><strong>${escapeHtml(c.name)}</strong></td>
          <td style="padding: 6px 10px; border-bottom: 1px solid #E2E8F0;"><code>${escapeHtml(c.rawPhone)}</code></td>
          <td style="padding: 6px 10px; border-bottom: 1px solid #E2E8F0;"><code>+${escapeHtml(c.phone)}</code></td>
          <td style="padding: 6px 10px; border-bottom: 1px solid #E2E8F0; color: #059669;">
            Hi ${escapeHtml(c.name)}, ...
          </td>
        </tr>
      `).join('');
    }
  }
}

function renderDynamicPlaceholders() {
  if (!elements.boxDynamicPlaceholders) return;

  const placeholders = ['{name}'];

  if (state.excelColumns && state.excelColumns.length > 0) {
    state.excelColumns.forEach(col => {
      const tag = `{${col.toLowerCase().replace(/[^a-z0-9]/g, '_')}}`;
      if (!placeholders.includes(tag) && tag !== '{name}') {
        placeholders.push(tag);
      }
    });
  }

  elements.boxDynamicPlaceholders.innerHTML = `
    <span style="font-size: 11px; color: #64748B;">Insert variable:</span>
    ${placeholders.map(p => `
      <button type="button" class="btn btn-secondary btn-sm" style="padding: 2px 8px; font-size: 12px;" onclick="insertMessagePlaceholder('${escapeHtml(p)}')">
        + ${escapeHtml(p)}
      </button>
    `).join('')}
  `;
}

window.insertMessagePlaceholder = function(tag) {
  if (!elements.campaignMessage) return;
  const textarea = elements.campaignMessage;
  const start = textarea.selectionStart || 0;
  const end = textarea.selectionEnd || 0;
  const text = textarea.value;
  textarea.value = text.substring(0, start) + tag + text.substring(end);
  textarea.focus();
  textarea.selectionStart = textarea.selectionEnd = start + tag.length;
};

function downloadSampleExcelTemplate() {
  if (typeof XLSX === 'undefined') {
    alert('Excel library is loading. Please try again.');
    return;
  }

  const sampleData = [
    {
      "Student Name": "Aarav Sharma",
      "WhatsApp Number": "9876543210",
      "Course": "Biotechnology Advance Training (15D)",
      "Registration No": "HBL-2026-001",
      "College": "Amity University"
    },
    {
      "Student Name": "Diya Patel",
      "WhatsApp Number": "9812345678",
      "Course": "Industrial Biotech Training (30D)",
      "Registration No": "HBL-2026-002",
      "College": "Delhi University"
    },
    {
      "Student Name": "Rohan Verma",
      "WhatsApp Number": "9711223344",
      "Course": "Short Term Biotechnology (7D)",
      "Registration No": "HBL-2026-003",
      "College": "Sharda University"
    }
  ];

  const ws = XLSX.utils.json_to_sheet(sampleData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Student_Contacts");
  XLSX.writeFile(wb, "Helix_Student_Contacts_Sample.xlsx");
}


// ====================================================
// STUDENT INTEREST & DRIP CONSENT ENGINE
// ====================================================

let consentState = {
  interested: [],
  notInterested: []
};

async function fetchDripConsent() {
  try {
    const res = await fetch('/api/drip/consent-status');
    if (!res.ok) return;
    const data = await res.json();
    if (!data.success) return;

    consentState.interested = Array.isArray(data.interested) ? data.interested : [];
    consentState.notInterested = Array.isArray(data.notInterested) ? data.notInterested : [];

    const intCount = consentState.interested.length;
    const notIntCount = consentState.notInterested.length;

    if (elements.consentInterestedCount) elements.consentInterestedCount.textContent = intCount;
    if (elements.consentNotInterestedCount) elements.consentNotInterestedCount.textContent = notIntCount;
    if (elements.badgeConsentInterested) elements.badgeConsentInterested.textContent = intCount;
    if (elements.badgeConsentNotInterested) elements.badgeConsentNotInterested.textContent = notIntCount;

    filterAndRenderInterestedTable();
    filterAndRenderNotInterestedTable();
  } catch (err) {
    console.error('Failed to fetch drip consent status:', err);
  }
}
window.fetchDripConsent = fetchDripConsent;

function filterAndRenderInterestedTable() {
  if (!elements.dripConsentInterestedBody) return;
  const query = (elements.searchInterestedInput ? elements.searchInterestedInput.value : '').toLowerCase().trim();

  const filtered = consentState.interested.filter(item => {
    if (!query) return true;
    const name = String(item.name || '').toLowerCase();
    const phone = String(item.phone || '').toLowerCase();
    const cat = String(item.category || '').toLowerCase();
    return name.includes(query) || phone.includes(query) || cat.includes(query);
  });

  if (filtered.length === 0) {
    elements.dripConsentInterestedBody.innerHTML = '<tr><td colspan="7" class="text-center" style="padding:24px; color:#64748B;">No matching interested candidates found.</td></tr>';
    return;
  }

  elements.dripConsentInterestedBody.innerHTML = filtered.map((item, idx) => {
    const name = escapeHtml(item.name || 'Candidate');
    const phone = escapeHtml(item.phone || '');
    const category = escapeHtml(item.category || 'Biotechnology Training');
    const dateStr = item.opted_at ? new Date(item.opted_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' }) : 'Recently Opted-In';
    const cleanNum = String(phone).replace(/[^0-9]/g, '');

    return `
      <tr>
        <td style="font-weight:600; color:#64748B;">${idx + 1}</td>
        <td>
          <div style="font-weight:700; color:#0F172A;">${name}</div>
        </td>
        <td>
          <a href="https://wa.me/${cleanNum}" target="_blank" style="color:#0284c7; font-weight:600; text-decoration:none; display:inline-flex; align-items:center; gap:5px;">
            <i class="fa-brands fa-whatsapp" style="color:#25D366;"></i> +${cleanNum}
          </a>
        </td>
        <td>
          <span style="background:#F1F5F9; color:#334155; font-size:11px; padding:3px 8px; border-radius:4px; font-weight:600;">${category}</span>
        </td>
        <td style="font-size:12px; color:#64748B;">${dateStr}</td>
        <td>
          <span class="badge" style="background:#DCFCE7; color:#15803D; font-weight:700; padding:4px 8px; border-radius:4px;">
            <i class="fa-solid fa-check"></i> Interested
          </span>
        </td>
        <td>
          <button type="button" class="btn btn-secondary btn-sm" onclick="toggleStudentConsent('${cleanNum}@s.whatsapp.net', '${cleanNum}', 'opt_out', 'Unsubscribed by Counselor')" style="font-size:11px; padding:4px 8px; color:#DC2626; border-color:#FECACA;" title="Move to Not Interested / Unsubscribed list">
            <i class="fa-solid fa-user-xmark"></i> Unsubscribe
          </button>
        </td>
      </tr>
    `;
  }).join('');
}
window.filterAndRenderInterestedTable = filterAndRenderInterestedTable;

function filterAndRenderNotInterestedTable() {
  if (!elements.dripConsentNotInterestedBody) return;
  const query = (elements.searchNotInterestedInput ? elements.searchNotInterestedInput.value : '').toLowerCase().trim();

  const filtered = consentState.notInterested.filter(item => {
    if (!query) return true;
    const name = String(item.name || '').toLowerCase();
    const phone = String(item.phone || '').toLowerCase();
    const reason = String(item.reason || '').toLowerCase();
    return name.includes(query) || phone.includes(query) || reason.includes(query);
  });

  if (filtered.length === 0) {
    elements.dripConsentNotInterestedBody.innerHTML = '<tr><td colspan="7" class="text-center" style="padding:24px; color:#64748B;">No candidates in opt-out list.</td></tr>';
    return;
  }

  elements.dripConsentNotInterestedBody.innerHTML = filtered.map((item, idx) => {
    const name = escapeHtml(item.name || 'Candidate');
    const phone = escapeHtml(item.phone || '');
    const reason = escapeHtml(item.reason || 'Replied NOT INTERESTED / STOP');
    const dateStr = item.opted_at ? new Date(item.opted_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' }) : 'Opted-Out';
    const cleanNum = String(phone).replace(/[^0-9]/g, '');

    return `
      <tr>
        <td style="font-weight:600; color:#64748B;">${idx + 1}</td>
        <td>
          <div style="font-weight:700; color:#0F172A;">${name}</div>
        </td>
        <td>
          <span style="font-family:monospace; font-weight:600; color:#334155;">+${cleanNum}</span>
        </td>
        <td>
          <span style="background:#FEE2E2; color:#991B1B; font-size:11px; padding:3px 8px; border-radius:4px; font-weight:600;">${reason}</span>
        </td>
        <td style="font-size:12px; color:#64748B;">${dateStr}</td>
        <td>
          <span class="badge" style="background:#FEE2E2; color:#B91C1C; font-weight:700; padding:4px 8px; border-radius:4px;">
            <i class="fa-solid fa-ban"></i> Blacklisted from Drip
          </span>
        </td>
        <td>
          <button type="button" class="btn btn-secondary btn-sm" onclick="toggleStudentConsent('${cleanNum}@s.whatsapp.net', '${cleanNum}', 'opt_in')" style="font-size:11px; padding:4px 8px; color:#15803D; border-color:#BBF7D0;" title="Restore to Interested / Re-enroll into drip">
            <i class="fa-solid fa-user-plus"></i> Re-enroll
          </button>
        </td>
      </tr>
    `;
  }).join('');
}
window.filterAndRenderNotInterestedTable = filterAndRenderNotInterestedTable;

async function toggleStudentConsent(chatId, phone, action, reason = null) {
  try {
    const res = await fetch('/api/drip/toggle-consent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatId, phone, action, reason })
    });
    if (res.ok) {
      await fetchDripConsent();
      await fetchDripSubscribers();
    }
  } catch (err) {
    console.error('Failed to toggle student consent:', err);
  }
}
window.toggleStudentConsent = toggleStudentConsent;
