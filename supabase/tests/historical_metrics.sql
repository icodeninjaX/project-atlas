begin;
create extension if not exists pgtap with schema extensions;
select plan(27);

insert into auth.users (id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at,raw_app_meta_data,raw_user_meta_data) values
 ('b1000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','history-a@example.test','',now(),now(),now(),'{}','{}'),
 ('b1000000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','history-b@example.test','',now(),now(),now(),'{}','{}');
insert into public.financial_accounts(id,user_id,name,account_type) values
 ('b1100000-0000-4000-8000-000000000001','b1000000-0000-4000-8000-000000000001','Cash','cash'),
 ('b1100000-0000-4000-8000-000000000002','b1000000-0000-4000-8000-000000000002','Cash','cash');
insert into public.transaction_categories(id,user_id,name,category_type) values
 ('b1200000-0000-4000-8000-000000000001','b1000000-0000-4000-8000-000000000001','History income','income'),
 ('b1200000-0000-4000-8000-000000000002','b1000000-0000-4000-8000-000000000002','History income','income'),
 ('b1200000-0000-4000-8000-000000000003','b1000000-0000-4000-8000-000000000001','History expense','expense');
insert into public.transactions(id,user_id,account_id,category_id,transaction_type,amount_centavos,transaction_date) values
 ('b1300000-0000-4000-8000-000000000001','b1000000-0000-4000-8000-000000000001','b1100000-0000-4000-8000-000000000001','b1200000-0000-4000-8000-000000000001','income',12345,timezone('Asia/Manila',now())::date-12),
 ('b1300000-0000-4000-8000-000000000002','b1000000-0000-4000-8000-000000000002','b1100000-0000-4000-8000-000000000002','b1200000-0000-4000-8000-000000000002','income',999999,timezone('Asia/Manila',now())::date-12),
 ('b1300000-0000-4000-8000-000000000003','b1000000-0000-4000-8000-000000000001','b1100000-0000-4000-8000-000000000001','b1200000-0000-4000-8000-000000000003','expense',4000000000000000,timezone('Asia/Manila',now())::date-9),
 ('b1300000-0000-4000-8000-000000000004','b1000000-0000-4000-8000-000000000001','b1100000-0000-4000-8000-000000000001','b1200000-0000-4000-8000-000000000003','expense',4000000000000000,timezone('Asia/Manila',now())::date-9);
insert into public.debts(id,user_id,creditor_name,debt_type,original_balance_centavos,current_balance_centavos) values
 ('b1500000-0000-4000-8000-000000000001','b1000000-0000-4000-8000-000000000001','History debt','personal_loan',50000,50000);
insert into public.debt_payments(id,user_id,debt_id,amount_centavos,payment_date) values
 ('b1600000-0000-4000-8000-000000000001','b1000000-0000-4000-8000-000000000001','b1500000-0000-4000-8000-000000000001',1234,timezone('Asia/Manila',now())::date-11);
insert into public.tasks(id,user_id,title,status,completed_at) values
 ('b1400000-0000-4000-8000-000000000001','b1000000-0000-4000-8000-000000000001','Done','completed',(timezone('Asia/Manila',now())::date-2)::timestamp at time zone 'Asia/Manila'),
 ('b1400000-0000-4000-8000-000000000002','b1000000-0000-4000-8000-000000000001','Open','inbox',null);
insert into public.tasks(id,user_id,title,status,completed_at) values
 ('b1400000-0000-4000-8000-000000000003','b1000000-0000-4000-8000-000000000001','Manila boundary','completed',((timezone('Asia/Manila',now())::date-3)::timestamp + interval '17 hours') at time zone 'UTC');
insert into public.weekly_reviews(user_id,week_start,overall_score,completed_at) values
 ('b1000000-0000-4000-8000-000000000001',date_trunc('week',(timezone('Asia/Manila',now())::date-14)::timestamp)::date,8,now()),
 ('b1000000-0000-4000-8000-000000000001',date_trunc('week',(timezone('Asia/Manila',now())::date-7)::timestamp)::date,6,now());
with previous_month as (
  select date_trunc('month', timezone('Asia/Manila',now())::date::timestamp - interval '1 month')::date as month_start
), first_monday as (
  select date_trunc('week', (month_start + 6)::timestamp)::date as week_start from previous_month
)
insert into public.weekly_reviews(user_id,week_start,overall_score,completed_at)
select 'b1000000-0000-4000-8000-000000000002', first_monday.week_start + score.week_offset * 7,
  score.overall_score, now()
from first_monday cross join (values (0,1), (1,1), (2,2)) as score(week_offset,overall_score);
select set_config('request.jwt.claims','{"sub":"b1000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
insert into public.knowledge_concepts(id,user_id,title,notes,category) values
 ('b1700000-0000-4000-8000-000000000001','b1000000-0000-4000-8000-000000000001','History concept','Test knowledge history','Test');
insert into public.knowledge_reviews(id,user_id,concept_id,outcome,previous_interval_days,next_interval_days,reviewed_at,next_review_at) values
 ('b1800000-0000-4000-8000-000000000001','b1000000-0000-4000-8000-000000000001','b1700000-0000-4000-8000-000000000001','good',0,1,((timezone('Asia/Manila',now())::date-6)::timestamp + interval '17 hours') at time zone 'UTC',now() + interval '1 day');

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"b1000000-0000-4000-8000-000000000001","role":"authenticated"}',true);

select is((select value from public.atlas_historical_metrics(timezone('Asia/Manila',now())::date-20,timezone('Asia/Manila',now())::date,'day')
 where metric_key='income_centavos' and period_start=timezone('Asia/Manila',now())::date-12),12345::numeric,'income reconciles to owner transaction');
select is((select source_count from public.atlas_historical_metrics(timezone('Asia/Manila',now())::date-20,timezone('Asia/Manila',now())::date,'day')
 where metric_key='income_centavos' and period_start=timezone('Asia/Manila',now())::date-12),1::bigint,'other owner is excluded');
select is((select first_recorded_on from public.atlas_historical_metrics(timezone('Asia/Manila',now())::date-10,timezone('Asia/Manila',now())::date,'day')
 where metric_key='income_centavos' and period_start=timezone('Asia/Manila',now())::date-10),timezone('Asia/Manila',now())::date-12,'first date remains global when it precedes the requested range');
select is((select value from public.atlas_historical_metrics(timezone('Asia/Manila',now())::date-10,timezone('Asia/Manila',now())::date,'day')
 where metric_key='income_centavos' and period_start=timezone('Asia/Manila',now())::date-10),0::numeric,'empty range after first record remains recorded zero');
select is((select value from public.atlas_historical_metrics(timezone('Asia/Manila',now())::date-20,timezone('Asia/Manila',now())::date,'day')
 where metric_key='expense_centavos' and period_start=timezone('Asia/Manila',now())::date-9),8000000000000000::numeric,'large expense sum remains exact within client safe range');
select is((select source_count from public.atlas_historical_metrics(timezone('Asia/Manila',now())::date-20,timezone('Asia/Manila',now())::date,'day')
 where metric_key='expense_centavos' and period_start=timezone('Asia/Manila',now())::date-9),2::bigint,'expense has explicit source count');
select is((select value from public.atlas_historical_metrics(timezone('Asia/Manila',now())::date-20,timezone('Asia/Manila',now())::date,'day')
 where metric_key='debt_payments_centavos' and period_start=timezone('Asia/Manila',now())::date-11),1234::numeric,'debt payment amount uses payment date');
select is((select value from public.atlas_historical_metrics(timezone('Asia/Manila',now())::date-20,timezone('Asia/Manila',now())::date,'day')
 where metric_key='knowledge_reviews' and period_start=timezone('Asia/Manila',now())::date-5),1::numeric,'knowledge review uses Manila timestamp boundary');
select is((select first_recorded_on from public.atlas_historical_metrics(timezone('Asia/Manila',now())::date-1,timezone('Asia/Manila',now())::date,'day')
 where metric_key='knowledge_reviews' and period_start=timezone('Asia/Manila',now())::date-1),timezone('Asia/Manila',now())::date-5,'knowledge first date remains outside the requested window');
select is((select coverage from public.atlas_historical_metrics(timezone('Asia/Manila',now())::date-20,timezone('Asia/Manila',now())::date,'day')
 where metric_key='income_centavos' and period_start=timezone('Asia/Manila',now())::date-19),'insufficient','before first record is missing');
select is((select value from public.atlas_historical_metrics(timezone('Asia/Manila',now())::date-20,timezone('Asia/Manila',now())::date,'day')
 where metric_key='income_centavos' and period_start=timezone('Asia/Manila',now())::date-10),0::numeric,'later empty recorded day is zero recorded activity');
select is((select coverage from public.atlas_historical_metrics(timezone('Asia/Manila',now())::date-20,timezone('Asia/Manila',now())::date,'day')
 where metric_key='income_centavos' and period_start=timezone('Asia/Manila',now())::date),'partial','current Manila day is partial');
select is((select value from public.atlas_historical_metrics(timezone('Asia/Manila',now())::date-20,timezone('Asia/Manila',now())::date,'day')
 where metric_key='task_completions' and period_start=timezone('Asia/Manila',now())::date-2),2::numeric,'Manila timestamp boundary and only completed tasks count');
select is((select first_recorded_on from public.atlas_historical_metrics(timezone('Asia/Manila',now())::date-1,timezone('Asia/Manila',now())::date,'day')
 where metric_key='task_completions' and period_start=timezone('Asia/Manila',now())::date-1),timezone('Asia/Manila',now())::date-2,'task first date remains outside the requested window');
select is((select coverage from public.atlas_historical_metrics(timezone('Asia/Manila',now())::date-20,timezone('Asia/Manila',now())::date,'day')
 where metric_key='review_overall_score' and period_start=timezone('Asia/Manila',now())::date-2),'insufficient','missing review score is not zero');
select is((select coverage from public.atlas_historical_metrics(timezone('Asia/Manila',now())::date-20,timezone('Asia/Manila',now())::date,'day')
 where metric_key='review_overall_score' and period_start=timezone('Asia/Manila',now())::date),'insufficient','missing current score is not a partial numeric period');
select is((select value from public.atlas_historical_metrics(timezone('Asia/Manila',now())::date-20,timezone('Asia/Manila',now())::date,'week')
 where metric_key='review_overall_score' and period_start=date_trunc('week',(timezone('Asia/Manila',now())::date-7)::timestamp)::date),6::numeric,'weekly score follows review week start');
select is((select count(*) from public.atlas_historical_metrics(timezone('Asia/Manila',now())::date-20,timezone('Asia/Manila',now())::date,'month')
 where metric_key='income_centavos'),(select count(*) from generate_series(date_trunc('month',(timezone('Asia/Manila',now())::date-20)::timestamp),date_trunc('month',timezone('Asia/Manila',now())::date::timestamp),interval '1 month')),'monthly calendar buckets are generated');
select is((select source_count from public.atlas_historical_metrics(timezone('Asia/Manila',now())::date-20,timezone('Asia/Manila',now())::date,'week')
 where metric_key='review_overall_score' and period_start=date_trunc('week',(timezone('Asia/Manila',now())::date-14)::timestamp)::date),1::bigint,'score has explicit denominator');
select throws_ok($$select * from public.atlas_historical_metrics(current_date-90,current_date,'day')$$,'22023',null,'daily series over 90 days rejected');
select throws_ok($$select * from public.atlas_historical_metrics(current_date-400,current_date,'month')$$,'22023',null,'old lookback rejected');
select throws_ok($$select * from public.atlas_historical_metrics(current_date-20,current_date,'year')$$,'22023',null,'unapproved grain rejected');

update public.transactions set amount_centavos=54321 where id='b1300000-0000-4000-8000-000000000001';
select is((select value from public.atlas_historical_metrics(timezone('Asia/Manila',now())::date-20,timezone('Asia/Manila',now())::date,'day')
 where metric_key='income_centavos' and period_start=timezone('Asia/Manila',now())::date-12),54321::numeric,'late edit recomputes');
delete from public.transactions where id='b1300000-0000-4000-8000-000000000001';
select is((select coverage from public.atlas_historical_metrics(timezone('Asia/Manila',now())::date-20,timezone('Asia/Manila',now())::date,'day')
 where metric_key='income_centavos' and period_start=timezone('Asia/Manila',now())::date-12),'insufficient','deletion removes source history');
select set_config('request.jwt.claims','{"sub":"b1000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select is((select value from public.atlas_historical_metrics(timezone('Asia/Manila',now())::date-20,timezone('Asia/Manila',now())::date,'day')
 where metric_key='income_centavos' and period_start=timezone('Asia/Manila',now())::date-12),999999::numeric,'second owner sees own history');
select is((select value from public.atlas_historical_metrics(
  date_trunc('month', timezone('Asia/Manila',now())::date::timestamp - interval '1 month')::date,
  (date_trunc('month', timezone('Asia/Manila',now())::date::timestamp)::date - 1),
  'month') where metric_key='review_overall_score'),1.33::numeric,'monthly score averages three reviews and rounds to two decimals');
select ok(not has_function_privilege('anon','public.atlas_historical_metrics(date,date,text)','EXECUTE'),'anonymous invocation revoked');

select * from finish();
rollback;
