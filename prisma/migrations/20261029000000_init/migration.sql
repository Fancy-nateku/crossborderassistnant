-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('TRADER', 'INTERMEDIARY', 'ADMIN');

-- CreateEnum
CREATE TYPE "CommonListStatus" AS ENUM ('YES', 'NO', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "TrustState" AS ENUM ('VERIFIED', 'UNVERIFIED', 'CONFLICTING', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "SourceStatus" AS ENUM ('VERIFIED', 'UNVERIFIED', 'CONFLICTING');

-- CreateEnum
CREATE TYPE "RuleStatus" AS ENUM ('ACTIVE', 'DRAFT', 'RETIRED');

-- CreateEnum
CREATE TYPE "CountryCode" AS ENUM ('KE', 'UG');

-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('KES', 'UGX');

-- CreateEnum
CREATE TYPE "Unit" AS ENUM ('BAGS', 'KILOGRAMS', 'CRATES');

-- CreateEnum
CREATE TYPE "Verdict" AS ENUM ('LIKELY_STR_ELIGIBLE', 'ABOVE_THRESHOLD', 'NOT_ON_COMMON_LIST', 'CANNOT_CONFIRM');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "phone" TEXT,
    "phoneVerified" TIMESTAMP(3),
    "passwordHash" TEXT,
    "image" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'TRADER',
    "language" TEXT NOT NULL DEFAULT 'en',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "Border" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "countryFrom" "CountryCode" NOT NULL,
    "countryTo" "CountryCode" NOT NULL,
    "note" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "deskContact" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Border_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "officialName" TEXT NOT NULL,
    "onCommonList" "CommonListStatus" NOT NULL DEFAULT 'UNKNOWN',
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductLocalName" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductLocalName_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Source" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT,
    "publishedAt" TEXT,
    "lastVerifiedAt" TEXT,
    "status" "SourceStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "verifiedBy" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Source_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Requirement" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "plainExplanation" TEXT NOT NULL,
    "officialFee" TEXT,
    "whereToObtain" TEXT,
    "caveatSubject" TEXT,
    "caveatBody" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Requirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequirementSource" (
    "requirementId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "RequirementSource_pkey" PRIMARY KEY ("requirementId","sourceId")
);

-- CreateTable
CREATE TABLE "Rule" (
    "id" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "countryFrom" "CountryCode" NOT NULL,
    "countryTo" "CountryCode" NOT NULL,
    "commonList" "CommonListStatus",
    "valueUsdAbove" DOUBLE PRECISION,
    "valueUsdUpTo" DOUBLE PRECISION,
    "verdict" "Verdict" NOT NULL,
    "sourceId" TEXT NOT NULL,
    "effectiveFrom" TEXT NOT NULL,
    "status" "RuleStatus" NOT NULL DEFAULT 'ACTIVE',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "verifiedAt" TEXT,
    "verifiedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Rule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RuleBorder" (
    "ruleId" TEXT NOT NULL,
    "ruleVersion" INTEGER NOT NULL,
    "borderId" TEXT NOT NULL,

    CONSTRAINT "RuleBorder_pkey" PRIMARY KEY ("ruleId","ruleVersion","borderId")
);

-- CreateTable
CREATE TABLE "RuleRequirement" (
    "ruleId" TEXT NOT NULL,
    "ruleVersion" INTEGER NOT NULL,
    "requirementId" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL,

    CONSTRAINT "RuleRequirement_pkey" PRIMARY KEY ("ruleId","ruleVersion","requirementId")
);

-- CreateTable
CREATE TABLE "ExchangeRate" (
    "id" TEXT NOT NULL,
    "currency" "Currency" NOT NULL,
    "ratePerUsd" DOUBLE PRECISION NOT NULL,
    "setAt" TEXT NOT NULL,
    "setBy" TEXT NOT NULL,
    "illustrative" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExchangeRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TradePlan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "countryFrom" "CountryCode" NOT NULL,
    "countryTo" "CountryCode" NOT NULL,
    "borderId" TEXT NOT NULL,
    "productId" TEXT,
    "quantity" INTEGER,
    "unit" "Unit" NOT NULL DEFAULT 'BAGS',
    "valueLocal" INTEGER,
    "currency" "Currency" NOT NULL DEFAULT 'KES',
    "valueUsd" DOUBLE PRECISION,
    "rateId" TEXT,
    "rateSnapshot" TEXT NOT NULL,
    "ruleId" TEXT,
    "ruleVersion" INTEGER,
    "verdict" "Verdict" NOT NULL,
    "asOf" TEXT NOT NULL,
    "ruleChanged" BOOLEAN NOT NULL DEFAULT false,
    "doneCount" INTEGER NOT NULL DEFAULT 0,
    "totalCount" INTEGER NOT NULL DEFAULT 0,
    "savedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TradePlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistItem" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "requirementId" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "titleSnapshot" TEXT NOT NULL,
    "plainExplanationSnapshot" TEXT NOT NULL,
    "officialFeeSnapshot" TEXT,
    "whereToObtainSnapshot" TEXT,
    "trustStateSnapshot" TEXT NOT NULL,
    "caveatSnapshot" TEXT,
    "sourcesSnapshot" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "actorRole" "UserRole" NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE INDEX "Border_active_idx" ON "Border"("active");

-- CreateIndex
CREATE INDEX "Border_countryFrom_countryTo_idx" ON "Border"("countryFrom", "countryTo");

-- CreateIndex
CREATE INDEX "Product_officialName_idx" ON "Product"("officialName");

-- CreateIndex
CREATE INDEX "Product_onCommonList_idx" ON "Product"("onCommonList");

-- CreateIndex
CREATE INDEX "ProductLocalName_name_idx" ON "ProductLocalName"("name");

-- CreateIndex
CREATE INDEX "ProductLocalName_productId_idx" ON "ProductLocalName"("productId");

-- CreateIndex
CREATE INDEX "Source_status_idx" ON "Source"("status");

-- CreateIndex
CREATE INDEX "RequirementSource_sourceId_idx" ON "RequirementSource"("sourceId");

-- CreateIndex
CREATE INDEX "Rule_status_effectiveFrom_priority_idx" ON "Rule"("status", "effectiveFrom", "priority");

-- CreateIndex
CREATE INDEX "Rule_countryFrom_countryTo_idx" ON "Rule"("countryFrom", "countryTo");

-- CreateIndex
CREATE UNIQUE INDEX "Rule_id_version_key" ON "Rule"("id", "version");

-- CreateIndex
CREATE INDEX "RuleBorder_borderId_idx" ON "RuleBorder"("borderId");

-- CreateIndex
CREATE INDEX "RuleRequirement_requirementId_idx" ON "RuleRequirement"("requirementId");

-- CreateIndex
CREATE INDEX "ExchangeRate_currency_setAt_idx" ON "ExchangeRate"("currency", "setAt");

-- CreateIndex
CREATE INDEX "TradePlan_userId_savedAt_idx" ON "TradePlan"("userId", "savedAt");

-- CreateIndex
CREATE INDEX "ChecklistItem_planId_displayOrder_idx" ON "ChecklistItem"("planId", "displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "ChecklistItem_planId_requirementId_key" ON "ChecklistItem"("planId", "requirementId");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductLocalName" ADD CONSTRAINT "ProductLocalName_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequirementSource" ADD CONSTRAINT "RequirementSource_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "Requirement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequirementSource" ADD CONSTRAINT "RequirementSource_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rule" ADD CONSTRAINT "Rule_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RuleBorder" ADD CONSTRAINT "RuleBorder_ruleId_ruleVersion_fkey" FOREIGN KEY ("ruleId", "ruleVersion") REFERENCES "Rule"("id", "version") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RuleBorder" ADD CONSTRAINT "RuleBorder_borderId_fkey" FOREIGN KEY ("borderId") REFERENCES "Border"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RuleRequirement" ADD CONSTRAINT "RuleRequirement_ruleId_ruleVersion_fkey" FOREIGN KEY ("ruleId", "ruleVersion") REFERENCES "Rule"("id", "version") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RuleRequirement" ADD CONSTRAINT "RuleRequirement_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "Requirement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradePlan" ADD CONSTRAINT "TradePlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistItem" ADD CONSTRAINT "ChecklistItem_planId_fkey" FOREIGN KEY ("planId") REFERENCES "TradePlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
