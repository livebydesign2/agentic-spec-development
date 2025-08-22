# Specification Numbering Registry

## 🔢 NEXT AVAILABLE NUMBERS
**SPEC-001** | **BUG-001** | **SPIKE-001** | **MAINT-001** | **RELEASE-001**

---

## 📋 QUICK REFERENCE COMMAND

**Before creating any new specification/bug/spike/maint:**
```bash
# Get next numbers quickly
grep -r "SPEC-[0-9]" docs/specs/ | grep -o "SPEC-[0-9]*" | sort -V | tail -1
grep -r "BUG-[0-9]" docs/specs/ | grep -o "BUG-[0-9]*" | sort -V | tail -1  
grep -r "SPIKE-[0-9]" docs/specs/ | grep -o "SPIKE-[0-9]*" | sort -V | tail -1
grep -r "MAINT-[0-9]" docs/specs/ | grep -o "MAINT-[0-9]*" | sort -V | tail -1
```

**For research spike investigations (RE-XXX):**
```bash
# Find next available investigation in a SPIKE
grep -A 5 "Next Available Investigation" docs/specs/*/SPIKE-XXX-*.md

# Check current investigation status in a SPIKE  
grep -A 10 "Current State" docs/specs/*/SPIKE-XXX-*.md
```

**Agent Instructions:**
1. Run command above to get current highest number
2. Add 1 to get your next number
3. Update this file with new "NEXT AVAILABLE" after creating
4. Use 3-digit padding: SPEC-001, BUG-014, SPIKE-007, MAINT-001, etc.

---

## 📊 CURRENT INVENTORY (Updated: [DATE])

### Specifications (SPEC-XXX)
- **Active**: [List active specs]
- **Backlog**: [List backlog specs]
- **Done**: [List completed specs]
- **Highest**: SPEC-000
- **Next**: SPEC-001

### Bugs (BUG-XXX)
- **Active**: [List active bugs]
- **Backlog**: [List backlog bugs]
- **Done**: [List completed bugs]
- **Highest**: BUG-000
- **Next**: BUG-001

### Research Spikes (SPIKE-XXX)
- **Active**: [List active spikes]
- **Backlog**: [List backlog spikes]
- **Done**: [List completed spikes]
- **Highest**: SPIKE-000
- **Next**: SPIKE-001

### Research Sub-Investigations (RE-XXX)
- **Structure**: RE-XXX numbers are scoped within each SPIKE-XXX
- **Lifecycle**: Created and completed within parent spike, not tracked independently
- **Usage**: RE-001, RE-002, RE-003 within each SPIKE document
- **Note**: RE numbers reset for each new SPIKE (not globally unique)

### Maintenance (MAINT-XXX)
- **Active**: [List active maintenance]
- **Backlog**: [List backlog maintenance]
- **Done**: [List completed maintenance]
- **Highest**: MAINT-000
- **Next**: MAINT-001

### Releases (RELEASE-XXX)
- **Created**: None yet
- **Next**: RELEASE-001

---

## 🔬 TWO-TIER RESEARCH SPIKE NUMBERING SYSTEM

### **Overview**
Research spikes use a hierarchical two-tier numbering system:
- **SPIKE-XXX**: Main research spike (globally unique)
- **RE-XXX**: Sub-investigations within each spike (scoped to parent spike)

### **When to Use SPIKE-XXX vs RE-XXX**

#### **Use SPIKE-XXX for:**
- **New major research topics** requiring investigation
- **Independent research questions** that could be worked on separately
- **Cross-cutting concerns** affecting multiple systems
- **Strategic research** informing product direction

#### **Use RE-XXX for:**
- **Sub-investigations within a SPIKE** that cannot be done independently
- **Sequential research steps** building on previous findings
- **Focused research tasks** assigned to individual agents within a spike
- **Breaking down complex research** into manageable chunks

### **Hierarchical Structure Examples**

#### **Example 1: Architecture Research**
```
SPIKE-002: System Architecture Analysis
├── RE-001: Current Architecture Analysis
├── RE-002: Performance Requirements Investigation  
└── RE-003: Recommendation & Implementation Plan
```

#### **Example 2: Technology Research**  
```
SPIKE-001: Framework Evaluation
├── RE-001: Current Technology Stack Analysis
├── RE-002: Alternative Framework Comparison
└── RE-003: Migration Strategy & Timeline
```

### **RE-XXX Numbering Rules**

1. **Scope**: RE numbers are scoped to their parent SPIKE only
2. **Reset**: Each new SPIKE starts with RE-001, RE-002, RE-003...
3. **Sequential**: RE numbers within a spike should be sequential (no gaps)
4. **Non-Global**: RE-001 in SPIKE-002 is different from RE-001 in SPIKE-003
5. **Lifecycle**: RE investigations live and die with their parent SPIKE

### **Agent Guidelines for Research Spikes**

#### **Creating a New Research Investigation:**
```bash
# Determine if this needs a new SPIKE or fits in existing SPIKE
1. Is this a new major research topic? → Create SPIKE-XXX
2. Is this part of existing research? → Add RE-XXX to existing SPIKE

# For new SPIKE (use NUMBERING.md "Next" number):
SPIKE-007-topic-name.md

# For sub-investigation (use next RE within the SPIKE):
# Add RE-004, RE-005, etc. within existing SPIKE document
```

#### **Working with Research Spikes:**
1. **Read the SPIKE document first** to understand current investigation status
2. **Find next available RE-XXX** (look for ⏳ or "Next Available Investigation")
3. **Complete ONE RE investigation only**, then hand off
4. **Update the SPIKE document** with findings and next available investigation
5. **Do not create separate files** for RE investigations - they live in the SPIKE

### **File Structure**
```
docs/specs/
├── active/
│   ├── SPIKE-002-architecture-analysis.md     ← Main spike file
│   └── SPIKE-006-performance-research.md      ← Another spike
├── backlog/
│   └── SPIKE-004-security-research.md         ← Spike not started
└── done/
    ├── SPIKE-001-framework-evaluation.md      ← Completed spike
    └── SPIKE-003-database-research.md         ← Completed spike
```

**Note**: RE investigations are documented WITHIN their parent SPIKE file, not as separate files.

---

## 🤖 AI AGENT WORKFLOW

### Creating New Item
1. **Check Current Numbers**: Read "NEXT AVAILABLE NUMBERS" section above
2. **Use Next Number**: Take the next available number for your type
3. **Create File**: Use format `TYPE-XXX-descriptive-name.md`
4. **Update This File**: Increment the "NEXT AVAILABLE" number
5. **Update Inventory**: Add your new item to current inventory

---

## 🔄 MAINTENANCE

**Weekly**: Product Manager Agent should verify numbering consistency  
**Monthly**: Clean up any duplicates or gaps discovered  
**When Moving Files**: Update inventory sections (backlog → active → done)

---

## 🚨 CRITICAL RULES

### **General Numbering Rules**
1. **Always check this file FIRST** before creating numbered items
2. **Always update this file AFTER** creating numbered items  
3. **Use 3-digit zero-padding**: 001, 014, 099, 100
4. **No skipping numbers**: Use the next sequential number always
5. **Fix duplicates immediately**: Rename files to use next available number

### **Research Spike Specific Rules**
6. **SPIKE-XXX are globally unique**: Follow main numbering sequence (SPIKE-007, SPIKE-008...)
7. **RE-XXX are scoped to parent SPIKE**: Each SPIKE starts with RE-001, RE-002, RE-003...
8. **No separate RE files**: RE investigations live within their parent SPIKE document
9. **One investigation per agent**: Complete one RE-XXX, update status, then hand off
10. **Update SPIKE status**: Always update "Next Available Investigation" after completing RE-XXX