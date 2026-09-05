import React, { useMemo, useState } from 'react';
import { SearchBar } from '../ui/search-bar';
import { Switch } from '../ui/switch';
import { Toast } from '../ui/toast';
import { ActionToast } from '../ui/action-toast';
import { RosterTable } from '../ui/roster-table';

const ClubMembersTab = ({
  members,
  membersLoading,
  membersError,
  calculateYear,
  memberActionError,
  memberActionSuccess,
  isClubHead = false,
  onOpenAddMember,
  onRemoveMember,
  onToggleAdminAccess,
  addMemberOpen,
  onCloseAddMember,
  memberSearch,
  setMemberSearch,
  memberDepartmentFilter,
  setMemberDepartmentFilter,
  memberYearFilter,
  setMemberYearFilter,
  studentResults,
  studentsLoading,
  studentsError,
  onAddMember,
  memberDepartmentOptions,
  studentYearOptions,
}) => {
  const [memberQuery, setMemberQuery] = useState('');

  const yearRank = { I: 1, II: 2, III: 3, IV: 4, V: 5, Alumni: 6, '-': 7 };

  const filteredMembers = useMemo(() => {
    const normalized = memberQuery.trim().toLowerCase();
    const matched = normalized
      ? members.filter((member) =>
          [member.name, member.email, member.department, member.register_number]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(normalized)),
        )
      : members;

    return [...matched].sort((left, right) => {
      const leftYear = yearRank[calculateYear(left.batch, left.degree, left.register_number)] ?? 7;
      const rightYear = yearRank[calculateYear(right.batch, right.degree, right.register_number)] ?? 7;
      if (leftYear !== rightYear) return rightYear - leftYear;

      const leftName = String(left.name || left.email || '').trim();
      const rightName = String(right.name || right.email || '').trim();
      return leftName.localeCompare(rightName, undefined, { sensitivity: 'base' });
    });
  }, [members, memberQuery, calculateYear]);

  const visibleMembers = filteredMembers.length;

  return (
    <div className="flex-1 overflow-y-auto p-3 sm:p-5 lg:p-7 xl:p-8">
      <div className="dashboard-hero enter-rise-settle mb-6 p-4 sm:mb-8 sm:p-6 lg:p-7">
        <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="kicker-label border-white/28 bg-white/10 text-white">Club Workforce</span>
            <h1 className="mt-3 font-display text-2xl font-bold text-white sm:text-3xl">Club Members</h1>
            <p className="mt-2 max-w-2xl text-sm text-white/82 sm:text-base">Students currently part of your club operations and execution team.</p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <div className="rounded-xl border border-white/15 bg-black/24 px-3 py-2 text-center text-white backdrop-blur-sm sm:px-4 sm:py-3">
              <p className="font-display text-xl font-bold leading-none sm:text-2xl">{members.length}</p>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.13em] text-white/75">Total</p>
            </div>
            <div className="rounded-xl border border-white/15 bg-black/24 px-3 py-2 text-center text-white backdrop-blur-sm sm:px-4 sm:py-3">
              <p className="font-display text-xl font-bold leading-none sm:text-2xl">{visibleMembers}</p>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.13em] text-white/75">Visible</p>
            </div>
          </div>
        </div>

        {isClubHead && (
          <button
            type="button"
            onClick={onOpenAddMember}
            className="relative z-10 mt-5 touch-target inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-100 sm:mt-6 sm:w-auto"
          >
            <span className="material-symbols-outlined text-[18px]">person_add</span>
            Add Member
          </button>
        )}
      </div>

      <div className="mb-4">
        <SearchBar
          value={memberQuery}
          onChange={setMemberQuery}
          placeholder="Search members"
        />
      </div>

      {membersError && (
        <Toast tone="error" title="Unable to load members" description={membersError} className="mb-4" />
      )}

      <div className="table-scroll overflow-hidden rounded-xl border border-border-subtle bg-surface-panel shadow-soft-sm dark:border-border-strong dark:bg-surface-elevated">
        {membersLoading ? (
          <div className="px-4 py-10 text-sm text-text-secondary dark:text-text-dark-secondary">Loading club members...</div>
        ) : (
          <RosterTable
            rows={filteredMembers}
            calculateYear={calculateYear}
            emptyMessage="No members match your search."
            extraColumns={isClubHead ? [
              {
                label: 'Admin Access',
                render: (member) => (
                  <Switch
                    checked={Boolean(member.is_delegated_admin)}
                    onCheckedChange={() => onToggleAdminAccess(member)}
                    ariaLabel={`Toggle admin access for ${member.name || member.email || 'member'}`}
                    className="mx-auto"
                  />
                ),
              },
              {
                label: 'Actions',
                render: (member) => (
                  <button
                    type="button"
                    onClick={() => onRemoveMember(member)}
                    className="inline-flex min-w-22 items-center justify-center rounded-full border border-red-500/25 px-3 py-1 text-xs font-semibold text-red-500 transition-colors hover:bg-red-500/10"
                  >
                    Remove
                  </button>
                ),
              },
            ] : []}
            mobileTopRight={isClubHead ? (member) => (
              <button
                type="button"
                onClick={() => onRemoveMember(member)}
                className="rounded-full border border-red-500/25 px-2.5 py-1 text-xs font-semibold text-red-500 transition-colors hover:bg-red-500/10"
              >
                Remove
              </button>
            ) : undefined}
            mobileFooter={isClubHead ? (member) => (
              <div className="mt-3 flex items-center justify-between rounded-lg bg-surface-muted px-2.5 py-2 dark:bg-border-strong/55">
                <p className="text-xs font-semibold text-text-secondary dark:text-text-dark-secondary">Admin Access</p>
                <Switch
                  checked={Boolean(member.is_delegated_admin)}
                  onCheckedChange={() => onToggleAdminAccess(member)}
                  ariaLabel={`Toggle admin access for ${member.name || member.email || 'member'}`}
                />
              </div>
            ) : undefined}
          />
        )}
      </div>

      {addMemberOpen && (
        <div className="fixed inset-0 z-1100 flex items-center justify-center overflow-y-auto bg-black/70 p-3 backdrop-blur-sm sm:p-5 lg:left-64" onClick={onCloseAddMember}>
          <div
            className="flex w-[min(96vw,76rem)] max-h-[92dvh] flex-col overflow-hidden rounded-2xl border border-border-subtle bg-surface-panel shadow-soft-xl dark:border-border-strong dark:bg-surface-elevated"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-border-subtle px-4 py-4 sm:px-5 dark:border-border-strong">
              <div>
                <h2 className="font-display text-lg font-bold">Add Club Member</h2>
                <p className="mt-0.5 text-xs text-text-secondary dark:text-text-dark-secondary">Search registered WAVC students. Filter by department and year.</p>
              </div>
              <button
                type="button"
                onClick={onCloseAddMember}
                className="touch-target flex h-8 w-8 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-surface-muted dark:text-text-dark-secondary dark:hover:bg-border-strong"
                aria-label="Close add member dialog"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="space-y-4 border-b border-border-subtle px-4 py-4 sm:px-5 dark:border-border-strong">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <SearchBar
                  value={memberSearch}
                  onChange={setMemberSearch}
                  placeholder="Search by name, email, register no"
                  className="h-10 rounded-xl bg-surface-muted dark:bg-border-strong"
                  inputClassName="px-2"
                  iconClassName="bg-transparent p-0 text-[18px]"
                />

                <select
                  value={memberDepartmentFilter}
                  onChange={(event) => setMemberDepartmentFilter(event.target.value)}
                  className="h-10 rounded-xl border border-border-subtle bg-white px-3 text-sm focus:border-primary focus:outline-none dark:border-border-strong dark:bg-[#111a22] dark:text-white"
                >
                  <option value="">All departments</option>
                  {memberDepartmentOptions.map((department) => (
                    <option key={department} value={department}>{department}</option>
                  ))}
                </select>

                <select
                  value={memberYearFilter}
                  onChange={(event) => setMemberYearFilter(event.target.value)}
                  className="h-10 rounded-xl border border-border-subtle bg-white px-3 text-sm focus:border-primary focus:outline-none dark:border-border-strong dark:bg-[#111a22] dark:text-white"
                >
                  <option value="">All years</option>
                  {studentYearOptions.map((year) => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>

              {studentsError && (
                <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-500">{studentsError}</p>
              )}
            </div>

            <div className="min-h-0 flex-1 overflow-auto px-4 py-4 sm:px-5">
              {studentsLoading ? (
                <div className="py-10 text-center text-sm text-text-secondary dark:text-text-dark-secondary">Loading registered students...</div>
              ) : (
                <RosterTable
                  rows={studentResults}
                  emptyMessage="No students found for current filters."
                  extraColumns={[
                    {
                      label: 'Add',
                      render: (student) => (
                        <button
                          type="button"
                          onClick={() => onAddMember(student.id)}
                          className="rounded-full bg-primary px-2.5 py-1 text-xs font-semibold text-white transition-colors hover:bg-primary/90"
                        >
                          Add
                        </button>
                      ),
                    },
                  ]}
                  mobileTopRight={(student) => (
                    <button
                      type="button"
                      onClick={() => onAddMember(student.id)}
                      className="rounded-full bg-primary px-2.5 py-1 text-xs font-semibold text-white transition-colors hover:bg-primary/90"
                    >
                      Add
                    </button>
                  )}
                />
              )}
            </div>
          </div>
        </div>
      )}

      <ActionToast
        message={memberActionError || memberActionSuccess}
        tone={memberActionError ? 'error' : 'success'}
        className="lg:left-64 lg:px-0"
      />
    </div>
  );
};

export default ClubMembersTab;
