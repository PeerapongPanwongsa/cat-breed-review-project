-- ===================== USERS & AUTHENTICATION =====================

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE,
    CONSTRAINT chk_username_length CHECK (char_length(username) >= 3),
    CONSTRAINT chk_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);

-- ===================== ROLES & PERMISSIONS =====================

CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE permissions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_roles (
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, role_id)
);

CREATE TABLE role_permissions (
    role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
    permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- ===================== REFRESH TOKENS =====================

CREATE TABLE refresh_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(500) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token);
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);

-- ===================== AUDIT LOGS =====================

CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,
    resource VARCHAR(50) NOT NULL,
    resource_id VARCHAR(100),
    details JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- ===================== CAT BREEDS (Admin manages) =====================

CREATE TABLE cat_breeds (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    origin VARCHAR(255),
    description TEXT,
    care_instructions TEXT,
    image_url TEXT,
    
    -- Engagement metrics 
    like_count INTEGER DEFAULT 0,
    dislike_count INTEGER DEFAULT 0,
    discussion_count INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    average_ratings JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    
    CONSTRAINT chk_name_not_empty CHECK (char_length(name) > 0)
);

CREATE INDEX idx_cat_breeds_name ON cat_breeds(name);
CREATE INDEX idx_cat_breeds_created_at ON cat_breeds(created_at);

-- ===================== BREED REACTIONS (Like/Dislike) =====================

CREATE TYPE reaction_type_enum AS ENUM ('like', 'dislike');

CREATE TABLE breed_reactions (
    id SERIAL PRIMARY KEY,
    breed_id INTEGER NOT NULL REFERENCES cat_breeds(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reaction_type reaction_type_enum NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- ผู้ใช้แต่ละคนกด like หรือ dislike ได้อันเดียวต่อ breed
    CONSTRAINT unique_user_breed_reaction UNIQUE (breed_id, user_id)
);

CREATE INDEX idx_breed_reactions_breed_id ON breed_reactions(breed_id);
CREATE INDEX idx_breed_reactions_user_id ON breed_reactions(user_id);

-- ===================== DISCUSSIONS (Comments) =====================

CREATE TABLE discussions (
    id SERIAL PRIMARY KEY,
    breed_id INTEGER NOT NULL REFERENCES cat_breeds(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    parent_id INTEGER REFERENCES discussions(id) ON DELETE CASCADE, -- สำหรับ reply
    
    -- Engagement
    like_count INTEGER DEFAULT 0,
    dislike_count INTEGER DEFAULT 0,
    reply_count INTEGER DEFAULT 0,
    ratings JSONB DEFAULT '{}', 
    tags TEXT[] DEFAULT '{}', 

    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT chk_message_not_empty CHECK (char_length(message) > 0)
);

CREATE INDEX idx_discussions_breed_id ON discussions(breed_id);
CREATE INDEX idx_discussions_user_id ON discussions(user_id);
CREATE INDEX idx_discussions_parent_id ON discussions(parent_id);
CREATE INDEX idx_discussions_created_at ON discussions(created_at);

-- ===================== DISCUSSION REACTIONS (Like/Dislike Comments) =====================

CREATE TABLE discussion_reactions (
    id SERIAL PRIMARY KEY,
    discussion_id INTEGER NOT NULL REFERENCES discussions(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reaction_type reaction_type_enum NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- ป้องกันกดซ้ำ
    CONSTRAINT unique_user_discussion_reaction UNIQUE (discussion_id, user_id)
);

CREATE INDEX idx_discussion_reactions_discussion_id ON discussion_reactions(discussion_id);
CREATE INDEX idx_discussion_reactions_user_id ON discussion_reactions(user_id);

-- ===================== TRIGGERS =====================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER update_cat_breeds_modtime
    BEFORE UPDATE ON cat_breeds
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_breed_reactions_modtime
    BEFORE UPDATE ON breed_reactions
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_discussions_modtime
    BEFORE UPDATE ON discussions
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- ===================== BREED REACTION COUNTERS =====================

-- Update cat_breeds like/dislike count
CREATE OR REPLACE FUNCTION update_breed_reaction_count()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        IF NEW.reaction_type = 'like' THEN
            UPDATE cat_breeds SET like_count = like_count + 1 WHERE id = NEW.breed_id;
        ELSE
            UPDATE cat_breeds SET dislike_count = dislike_count + 1 WHERE id = NEW.breed_id;
        END IF;
        RETURN NEW;
    ELSIF (TG_OP = 'UPDATE') THEN
        -- ถ้าเปลี่ยนจาก like -> dislike หรือ dislike -> like
        IF OLD.reaction_type = 'like' AND NEW.reaction_type = 'dislike' THEN
            UPDATE cat_breeds SET like_count = like_count - 1, dislike_count = dislike_count + 1 
            WHERE id = NEW.breed_id;
        ELSIF OLD.reaction_type = 'dislike' AND NEW.reaction_type = 'like' THEN
            UPDATE cat_breeds SET dislike_count = dislike_count - 1, like_count = like_count + 1 
            WHERE id = NEW.breed_id;
        END IF;
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        IF OLD.reaction_type = 'like' THEN
            UPDATE cat_breeds SET like_count = like_count - 1 WHERE id = OLD.breed_id;
        ELSE
            UPDATE cat_breeds SET dislike_count = dislike_count - 1 WHERE id = OLD.breed_id;
        END IF;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_breed_reaction_count
AFTER INSERT OR UPDATE OR DELETE ON breed_reactions
FOR EACH ROW EXECUTE FUNCTION update_breed_reaction_count();

-- ===================== DISCUSSION REACTION COUNTERS =====================

-- Update discussions like/dislike count
CREATE OR REPLACE FUNCTION update_discussion_reaction_count()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        IF NEW.reaction_type = 'like' THEN
            UPDATE discussions SET like_count = like_count + 1 WHERE id = NEW.discussion_id;
        ELSE
            UPDATE discussions SET dislike_count = dislike_count + 1 WHERE id = NEW.discussion_id;
        END IF;
        RETURN NEW;
    ELSIF (TG_OP = 'UPDATE') THEN
        IF OLD.reaction_type = 'like' AND NEW.reaction_type = 'dislike' THEN
            UPDATE discussions SET like_count = like_count - 1, dislike_count = dislike_count + 1 
            WHERE id = NEW.discussion_id;
        ELSIF OLD.reaction_type = 'dislike' AND NEW.reaction_type = 'like' THEN
            UPDATE discussions SET dislike_count = dislike_count - 1, like_count = like_count + 1 
            WHERE id = NEW.discussion_id;
        END IF;
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        IF OLD.reaction_type = 'like' THEN
            UPDATE discussions SET like_count = like_count - 1 WHERE id = OLD.discussion_id;
        ELSE
            UPDATE discussions SET dislike_count = dislike_count - 1 WHERE id = OLD.discussion_id;
        END IF;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_discussion_reaction_count
AFTER INSERT OR UPDATE OR DELETE ON discussion_reactions
FOR EACH ROW EXECUTE FUNCTION update_discussion_reaction_count();

-- ===================== DISCUSSION COUNTER =====================

-- Update cat_breeds discussion_count
CREATE OR REPLACE FUNCTION update_breed_discussion_count()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE cat_breeds SET discussion_count = discussion_count + 1 WHERE id = NEW.breed_id;
        -- Update parent reply count if this is a reply
        IF NEW.parent_id IS NOT NULL THEN
            UPDATE discussions SET reply_count = reply_count + 1 WHERE id = NEW.parent_id;
        END IF;
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE cat_breeds SET discussion_count = discussion_count - 1 WHERE id = OLD.breed_id;
        IF OLD.parent_id IS NOT NULL THEN
            UPDATE discussions SET reply_count = reply_count - 1 WHERE id = OLD.parent_id;
        END IF;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_breed_discussion_count
AFTER INSERT OR DELETE ON discussions
FOR EACH ROW EXECUTE FUNCTION update_breed_discussion_count();


-- ===================== INITIAL DATA =====================

-- Insert default roles
INSERT INTO roles (name) VALUES
('admin'),
('user');

-- Insert permissions
INSERT INTO permissions (name) VALUES
-- Cat breed permissions
('breed.create'),
('breed.update'),
('breed.delete'),
('breed.view'),

-- Discussion permissions
('discussion.create'),
('discussion.update'),
('discussion.delete'),
('discussion.delete.any'),

-- Reaction permissions
('reaction.create');

-- Assign permissions to roles
-- Admin gets all permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'admin';

-- User gets limited permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.name = 'user' AND p.name IN (
    'breed.view',
    'discussion.create', 'discussion.update', 'discussion.delete',
    'reaction.create'
);



-- Insert sample cat breeds
INSERT INTO cat_breeds (name, origin, description, care_instructions, image_url) VALUES
-- 1. Persian
(
    'Persian',
    'Iran',
    'ประวัติความเป็นมา\nต้นกำเนิดของ Persian ย้อนกลับไปกว่า 400 ปีก่อน นักเดินทางชาวอิตาลีชื่อ Pietro Della Valle ได้พาแมวขนยาวจากเมือง Khorasan ในจักรวรรดิเปอร์เซีย(ปัจจุบันคืออิหร่าน) เข้ามายังยุโรปช่วงศตวรรษที่ 17 ก่อนเผยแพร่ไปยังฝรั่งเศสและอังกฤษ และกลายเป็นสัตว์เลี้ยงยอดนิยมของชนชั้นสูงในยุโรป พัฒนาการของสายพันธุ์
หลังสงครามโลกครั้งที่สอง Breeder หันมาพัฒนาสายพันธุ์ภายใน ปรับโครงหน้าให้กลม อ่อนหวาน และดูแบ๊วขึ้น จนกลายเป็นเอกลักษณ์แบบอเมริกัน\n ลักษณะเด่นและนิสัย\n รูปลักษณ์: ใบหน้ากลม ดวงตาโต กลม จมูกสั้น หูเล็ก ปลายมน ลำตัวสั้น ขาใหญ่ กล้ามเนื้อแน่น ขนยาวหนานุ่ม มีชั้นขนละเอียด ที่ต้องได้รับการดูแลสม่ำเสมอ\n นิสัย: นุ่มนวล รักสงบ อ่อนโยน ไม่ชอบเสียงดัง ชอบอยู่ในที่เงียบสงบ อบอุ่น ชอบนั่งใกล้เจ้าของ คลอเคลียเบาๆ เหมาะกับผู้เลี้ยงที่ใส่ใจในรายละเอียด',
' เคล็ดลับในการดูแล: แปรงขนทุกวันเพื่อป้องกันขนพันกัน ล้างหน้าเบาๆ โดยเฉพาะใต้ตา ดูแลด้วยความอ่อนโยนและสม่ำเสมอ',
'https://th.bing.com/th/id/R.ff2b117a1b0a31ca0337350fb7b6a414?rik=zciiDhYA5Dwojg&riu=http%3a%2f%2f3.bp.blogspot.com%2f-XGuY67Abfak%2fT-XBkZBfvdI%2fAAAAAAAACrI%2fB3gqLaquQbY%2fs1600%2fPersian%252BCat%252Bimage.jpg&ehk=wjwfiVl20l3Zclx6Om584iY8MO4dxPbFn3CxUFRxXSk%3d&risl=&pid=ImgRaw&r=0'
),
-- 2. Scottish Fold
(
'Scottish Fold',
'Scotland',
'ประวัติความเป็นมา\nต้นกำเนิดของ Scottish Fold เริ่มในปี ค.ศ. 1961 ที่ฟาร์มแห่งหนึ่งในสกอตแลนด์ เมื่อวิลเลียม รอสส์ พบลูกแมวสีขาวหูพับชื่อ “ซูซี่” จึงนำมาพัฒนาและเพาะพันธุ์ร่วมกับภรรยา แมรี่ รอสส์ โดยผสมกับแมวสายพันธุ์อื่น จนได้ลูกแมวที่สืบทอดลักษณะหูพับอย่างต่อเนื่อง ในปี ค.ศ. 1966 จึงนำไปจดทะเบียนกับสถาบัน Governing Council of the Cat Fancy (GCCF) และตั้งชื่อสายพันธุ์ว่า Scottish Fold ก่อนจะแพร่หลายไปยังสหรัฐอเมริกาและเป็นที่นิยมทั่วโลก\n พัฒนาการของสายพันธุ์\nลักษณะหูพับของ Scottish Fold เกิดจากการกลายพันธุ์ของยีนที่มีผลต่อกระดูกอ่อน ลูกแมวจะเกิดมาพร้อมหูตั้งปกติ ก่อนที่หูของบางตัวจะเริ่มพับลงในช่วงอายุ 3–4 สัปดาห์ ระดับการพับมีทั้งแบบพับเล็กน้อยจนถึงพับแนบศีรษะ ปัจจุบันมีการพัฒนาทั้งแบบขนสั้นและขนยาว รูปร่างและใบหน้ากลมมน ดูคล้ายน้องตุ๊กตา\n ลักษณะเด่นและนิสัย\n รูปลักษณ์: ใบหน้ากลม ดวงตากลมโตหลายสี จมูกสั้นโค้งเล็กน้อย ลำตัวขนาดกลางค่อนข้างอวบแต่มีกล้ามเนื้อ ขาปานกลาง หางยาวโค้งมน ขนหนานุ่มทั้งแบบสั้นและยาว สีและลายหลากหลาย จุดเด่นที่สุดคือใบหูที่พับมาด้านหน้า ทำให้หน้าดูหวานและน่ารัก\n นิสัย: สุขุม เรียบร้อย ไม่ค่อยซุกซนหรือโลดโผน ชอบอยู่ใกล้และคลอเคลียเจ้าของ เข้ากับคนง่าย ปรับตัวกับบ้านใหม่ได้ดี มักมีท่าทางกวน ๆ น่ารัก เช่น นั่งท่าตุ๊กตาหมีหรือยืนสองขา เหมาะกับคนที่ต้องการแมวขี้อ้อนและบรรยากาศสงบในบ้าน',
' เคล็ดลับในการดูแล: แปรงขนสม่ำเสมอ (ขนสั้นสัปดาห์ละ 2–3 ครั้ง ขนยาวควรบ่อยกว่านั้น) เพื่อลดขนพันกันและการหลุดร่วง หมั่นตรวจหูและทำความสะอาดเบา ๆ ระวังน้ำหนักเกิน และพาไปตรวจสุขภาพข้อต่อและกระดูกกับสัตวแพทย์เป็นประจำ',
'https://th.bing.com/th/id/R.9745a753c9cf4ef65e22e180009d1a63?rik=JYUBsrhtDPnGaw&pid=ImgRaw&r=0'
),
-- 3. Maine Coon
(
'Maine Coon',
'United States',
'ประวัติความเป็นมา\nแมวพันธุ์ เมนคูน (Maine Coon) ถือเป็นแมวสายพันธุ์ขนยาวที่มีต้นกำเนิดจากการผสมข้ามพันธุ์ของแมวพื้นเมือง กับแมวป่าทางตอนเหนือของประเทศสหรัฐอเมริกา ซึ่งคำว่า “เมน” มาจากถิ่นกำเนิดคืออยู่ที่รัฐ Maine ประเทศสหรัฐอเมริกา ส่วนคำว่า “คูน” เชื่อกันว่าอาจมาจากพวกมันที่มีลักษณะคล้ายกับตัวแรคคูน คือ มีหางเป็นพวง มีสีและลวดลายสีน้ำตาลที่มีลักษณะเหมือนแรคคูนแมวพันธุ์เมนคูนเริ่มมีความนิยมลดลงในช่วงต้นปี ค.ศ. 1900 เนื่องจากได้มีการนำเข้าแมวจากยุโรป อย่างแมวเปอร์เซียที่มีขนาดเล็กกว่ามาก แต่ไม่นานกลุ่มอนุรักษ์สายพันธุ์แมวพื้นเมืองได้มีการจัดการแสดงนิทรรศการขึ้น ในปี ค.ศ. 1950 ทำให้ความนิยมของ “เมนคูน”กลับมาอีกครั้ง ทั้งในประเทศ ประเทศอังกฤษ และแพร่กระจายไปทั่วยุโรปในเวลาต่อมา\n ลักษณะเด่นและนิสัย\n
รูปลักษณ์: หัวใหญ่ หน้าผากกว้าง โหนกแก้มสูง มีอกว้าง ขนยาวหนา ใบหูชี้ตั้ง มีปลายแหลม และมีขนขึ้นที่ปลายหูคล้ายแมวป่า และมีอุ้งเท้าขนาดใหญ่\n นิสัย: ฉลาด ว่านอนสอนง่าย ไม่กลัวคนแปลกหน้า ชอบเล่นน้ำ มีนิสัยใจเย็น เรียบร้อย ชอบใกล้ชิดผู้คนเป็นอย่างมาก สามารถปรับตัวเข้ากับสิ่งแวดล้อมได้ดี รวมถึงสามารถเข้ากับคนภายในครอบครัว',
' เคล็ดลับในการดูแล: ครวแปรงขนอย่างน้อยสัปดาห์ละ 2-3 ครั้ง เพื่อป้องกันการพันกันเป็นก้อนและลดขนร่วง หมั่นตัดเล็บเป็นประจำเพราะเล็บของแมวเมนคูนมักจะยาวและแข็งแรง ให้อาหารที่มีคุณภาพและเหมาะสมกับขนาดตัว และพาไปตรวจสุขภาพกับสัตวแพทย์เป็นประจำ เพื่อป้องกันโรคต่างๆ',
'https://3.bp.blogspot.com/-08xprEsotoo/V-vlSd7M1UI/AAAAAAAAAyI/kGhFKKi-ww4ocdurGjp-ZRUgsDhjH3M_QCLcB/s1600/65%2BBreathtaking%2BPictures%2BOf%2BMaine%2BCoons%252C%2BThe%2BLargest%2BCats%2BIn%2BThe%2BWorld.jpg'
),
-- 4. Norwegian Forest
(
'Norwegian Forest',
'Norway',
'ประวัติความเป็นมา\nต้นกำเนิดมาจากแมวขนสั้นที่ชาวไวกิ้งนำเข้ามาในสหราชอาณาจักรผสมกับแมวพันธุ์ขนยาวที่นักรบครูเสดนำเข้ามาในประเทศกลุ่มสแกนดิเนเวีย แล้วผสมพันธุ์กับแมวในฟาร์มและแมวจรจัดอื่น ๆ เนื่องจากถิ่นกำเนิดของแมวนอร์วีเจียน ฟอเรสต์อยู่ในพื้นที่หนาวเย็นของสแกนดิเนเวียทำให้ปรับตัวเข้ากับฤดูหนาวที่อากาศหนาวเย็นและลำบากได้ เราจะเห็นได้จากลักษณะทางกายภาพของแมวสายพันธุ์นี้ที่มีขนสองชั้น ช่วยป้องกันลมหนาวและหิมะ แถมยังแห้งเร็วอีกด้วย แมวนอร์วีเจียน ฟอเรสต์เป็นสายพันธุ์ที่ถูกที่ยอมรับครั้งแรกในทศวรรษที่ 1930 โดยมีการปรากฏตัวในงานแสดงแมวในปี 1938 และในช่วงทศวรรษที่ 1970 แมวนอร์วีเจียน ฟอเรสต์ถูกนำเข้าจากประเทศนอร์เวย์\n ลักษณะเด่นและนิสัย\n รูปลักษณ์: ศีรษะรูปทรงสามเหลี่ยม หน้าผากลาด หูใหญ่ ดวงตาเป็นรูปอัลมอนด์ ลำตัวแข็งแรง มีกล้ามเนื้อ และมีขนาดใหญ่ หางยาว เป็นพวง และมักจะชูสูง ขนกึ่งยาว เป็นมันเงา และกันน้ำ มีขนชั้นในแน่น และมีสีสันหลากหลาย\n นิสัย: น่ารัก อ่อนหวาน เป็นมิตร ปรับตัวเก่ง ชอบปีนป่าย ขี้เล่น และเข้าสังคมเก่ง',
' เคล็ดลับในการดูแล: แปรงขนอย่างน้อยสัปดาห์ละสองครั้งและทุกวันในช่วงฤดูผลัดขน เพื่อให้แมวขจัดขนเก่าได้ ช่วยให้ขนของแมวอยู่ในสภาพที่ดี ไม่พันกัน และควรเช็ดมุมขอบตาของแมวนอร์วีเจียน ฟอเรสต์ทุกวัน โดยใช้ผ้าแยกกันสำหรับดวงตาแต่ละข้าง',
'https://www.thesprucepets.com/thmb/c4xUQ9bmuswDR-umoAKTmwH_r-A=/1500x0/filters:no_upscale():strip_icc()/norwegian-forest-cat-4170085-fe84aa86023446c4b64236ddfbdefd2b.jpg'
),
-- 5. Ragdoll
(
'Ragdoll',
'United States',
'ประวัติความเป็นมา\nต้นกำเนิดของ Ragdoll ย้อนไปช่วงทศวรรษ 1960 ที่เมืองริเวอร์ไซด์ รัฐแคลิฟอร์เนีย สหรัฐอเมริกา โดยแอนน์ เบเกอร์ (Ann Baker) เป็นผู้พัฒนาสายพันธุ์จากแมวขนยาวสีขาวชื่อ “โจเซฟีน” ที่มีนิสัยอ่อนโยน ชอบผ่อนคลายในอ้อมกอด เมื่อนำมาคัดเลือกและผสมพันธุ์ต่อ ก็ได้ลูกแมวที่ขนนุ่มและนิสัยนิ่มนวลคล้ายกัน ปัจจุบัน Ragdoll ได้รับการยอมรับเป็นสายพันธุ์แท้จากสมาคมแมวระดับโลก เช่น CFA และ TICA\n พัฒนาการของสายพันธุ์\nBreeder มุ่งพัฒนาให้ Ragdoll มีร่างกายใหญ่ ขนกึ่งยาวนุ่มดุจแพรไหม และบุคลิกผ่อนคลายเมื่อถูกอุ้ม (“Ragdoll effect”) พร้อมคัดเลือกสีและลวดลาย เช่น colorpoint, mitted และ bicolor ให้เป็นเอกลักษณ์ของสายพันธุ์\n ลักษณะเด่นและนิสัย\n รูปลักษณ์: แมวขนาดกลางถึงใหญ่ ตัวผู้ราว 6–9 กก. ตัวเมียประมาณ 4–7 กก. โครงสร้างใหญ่แน่น ดวงตากลมโตสีฟ้าสดใส ขนกึ่งยาว หนานุ่ม ไม่ค่อยพันกัน สีและลายหลากหลาย เช่น seal, blue, chocolate, lilac พร้อมลายยอดนิยมอย่าง colorpoint, mitted และ bicolor ทำให้ดูหรูหราและอบอุ่น\n นิสัย: อ่อนโยน รักสงบ ชอบอยู่ใกล้และตามติดเจ้าของ มักยอมปล่อยตัวนิ่ม ๆ เมื่อตัวถูกอุ้มเหมือนตุ๊กตาผ้า เข้ากับเด็กและสัตว์เลี้ยงอื่นได้ดี เหมาะกับครอบครัวและคนที่ต้องการแมวขี้อ้อน ใช้ชีวิตร่วมกับคนได้แบบสบายๆ',
' เคล็ดลับในการดูแล: แปรงขนสัปดาห์ละ 2–3 ครั้งเพื่อลดขนพันกันและรักษาความนุ่มสวย จัดอาหารที่เหมาะกับแมวขนาดใหญ่และควบคุมน้ำหนัก หมั่นตรวจสุขภาพหัวใจ (เสี่ยงโรค HCM) และจัดของเล่นหรือพื้นที่ให้ปีนป่ายเล็กน้อยเพื่อรักษาสุขภาพกายและใจ',
'https://wallpapercave.com/wp/wp8541259.jpg'
),
-- 6. Birman
(
'Birman',
'Myanmar',
'ประวัติความเป็นมา\nต้นกำเนิดของแมวเบอร์แมนย้อนกลับไปประมาณช่วงปลายศตวรรษที่ 19–ต้นศตวรรษที่ 20 ตามตำนานเล่าว่าแมวสายพันธุ์นี้มีถิ่นกำเนิดใน วัดของพระสงฆ์ในพม่า (Burma) แมวในวัดมีขนสีทองเหลืองอ่อน ใบหน้าสีเข้ม และดวงตาสีฟ้า เมื่อพระสงฆ์นำไปฝรั่งเศส แมวสายพันธุ์นี้ถูกผสมพันธุ์กับแมวท้องถิ่น จนเกิดเป็นแมวเบอร์แมนแบบที่รู้จักในปัจจุบัน แมวเบอร์แมนเริ่มเป็นที่นิยมในยุโรป โดยเฉพาะฝรั่งเศสและอังกฤษ\n พัฒนาการของสายพันธุ์\n มุ่งพัฒนาให้แมวเบอร์แมนมีลักษณะขนยาวหนานุ่ม ขนเรียงตัวสวยและไม่พันกันมากนัก รวมถึงคัดเลือกสีและลายเฉพาะ เพื่อให้เป็นเอกลักษณ์ชัดเจนของสายพันธุ์\n ลักษณะเด่นและนิสัย\n รูปลักษณ์: แมวขนาดกลางถึงใหญ่ ตัวผู้ราว 5–7 กก. ตัวเมียประมาณ 3–5 กก. โครงสร้างแข็งแรงแน่น ขนยาวปานกลางหนานุ่ม มีสีพื้นอ่อนและลายสีเข้มตามใบหน้า หู ขา และหาง ดวงตากลมโตสีฟ้า สวยและมีเสน่ห์\n นิสัย: อ่อนโยน เป็นมิตร ชอบอยู่ใกล้เจ้าของ เข้ากับเด็กและสัตว์เลี้ยงอื่นได้ดี มักนิ่งสงบและค่อนข้างขี้อ้อน เหมาะกับครอบครัวหรือคนที่ต้องการแมวรักสงบและนุ่มนวล',
' เคล็ดลับในการดูแล: แปรงขนสัปดาห์ละ 2–3 ครั้ง เพื่อลดขนพันกันและรักษาความนุ่มสวย หมั่นอาบน้ำเป็นประจำ และควรได้รับอาหารที่มีโปรตีนสูงซึ่งมีคาร์โบไฮเดรตต่ำ และอาหารจำพวกกรดไขมันโอเมก้า 3 และโอเมก้า 6 เพื่อดูแลขน',
'https://www.thesprucepets.com/thmb/D5s03LINbIYpZuiG6uvBpKrAKXk=/3500x0/filters:no_upscale():strip_icc()/GettyImages-623368786-f66c97ad6d2d494287b448415f4340a8.jpg'
),
-- 7. Siberian
(
'Siberian',
'Russia',
'ประวัติความเป็นมา\nต้นกำเนิดจากรัสเซีย โดยเฉพาะในพื้นที่หนาวเย็นอย่างไซบีเรีย ซึ่งเป็นเหตุผลว่าทำไมพวกมันจึงมีขนหนาและฟูเพื่อปกป้องจากอากาศหนาวจัด แมวสายพันธุ์นี้มีอายุยาวและปรับตัวเข้ากับสภาพอากาศหนาวเย็นได้ดี มีตำนานเล่าว่าเป็นแมวที่ใช้ไล่หนูและป้องกันบ้านของชาวรัสเซียมาหลายร้อยปี แมวไซบีเรียนได้รับการบันทึกอย่างเป็นทางการในยุโรปช่วงทศวรรษ 1980 และเริ่มได้รับความนิยมในสหรัฐอเมริกาในทศวรรษ 1990 เชื่อกันว่าสายพันธุ์นี้เกิดจากการผสมข้ามพันธุ์ระหว่าง แมวบ้านและแมวป่าในป่าไซบีเรีย ขนที่หนาและหนาแน่น เป็นการปรับตัวตามธรรมชาติเพื่อรับมือกับความหนาวเย็นจัดของรัสเซีย นอกจากนี้ยังเป็นที่รักของคนรักสัตว์ทั่วโลกเนื่องจากมีบุคลิกที่น่ารักและขี้เล่น\nลักษณะเด่นและนิสัย\n รูปลักษณ์: หัวกลมและกว้าง มีหน้าผากโค้งและปากกระบอกปืนที่ชัดเจน ตาใหญ่และเป็นรูปวงรี ขายาวและแข็งแรง มีอุ้งเท้าขนาดใหญ่ซึ่งช่วยให้เคลื่อนไหวบนหิมะได้\n นิสัย: อ่อนหวาน เข้ากับคนง่าย มีความฉลาด ความอยากรู้อยากเห็น ชอบปีนป่าย กระโดดและรักความเป็นอิสระ ',
' เคล็ดลับในการดูแล: แปรงหรือหวีสัปดาห์ละ 2 ครั้งเพื่อให้ขนไม่พันกัน ในระหว่างช่วงเวลาผลัดขน อาจต้องแปรงขนให้บ่อยขึ้น การทำความสะอาดใบหูและฟันเป็นประจำ ความต้องการพลังงานสูงดังนั้นควรให้อาหารที่มีโภชนาการสูง',
'https://mybritishshorthair.com/wp-content/uploads/2022/08/Siberian-Cat-Colors-640x377.jpg'
),
-- 8. Turkish Angora
(
'Turkish Angora',
'Turkey',
'ประวัติความเป็นมา\nเป็นหนึ่งในสายพันธุ์แมวที่เก่าแก่ที่สุดในโลก โดยมีถิ่นกำเนิดจากประเทศตุรกี มีประวัติยาวนานและเกี่ยวข้องกับวัฒนธรรมท้องถิ่นของตุรกีเป็นอย่างมาก แมวพันธุ์นี้มีความโดดเด่นในเรื่องขนยาวนุ่มละเอียดและรูปลักษณ์ที่สง่างาม เป็นแมวที่มีรูปร่างเพรียวบาง น้ำหนักเบา และมีความคล่องแคล่วสูง แต่ถูกเหมารวมว่าเป็นแมวเปอร์เซียเพราะมีลักษณะขนยาวคล้ายกันแต่เมื่อปีค.ศ. 1962 มีชายผู้ช่วยอเมริกาได้เข้าไปทำงานในสวนสัตว์ในแองโกร่า แล้วไปพบกับเจ้าแมวพันธุ์นี้เข้าจึงสังเกตเห็นความแตกต่างจากแมวเปอร์เซียหลายประการจึงนำเข้าไปเลี้ยงและพัฒนาสายพันธุ์ในอังกฤษ  โดยใช้เวลาทั้งสิ้นกว่า 45 ปี แมวเทอร์คิช แองโกร่า ถูกพัฒนาสายพันธุ์จนกระทั่งเป็นที่ยอมรับให้เป็นแมวสายพันธุ์เทอร์คิช แองโกร่า จาก CFA ในที่สุด\nลักษณะเด่นและนิสัย\n รูปลักษณ์: จะมีลำตัวยาว ขนเหมือนเส้นไหม ยาวและหนาเหมือนขนแกะ หางเล็ก คอสั้น หูตั้ง ลูกนัยน์ตากลมรี ขายาวกว่าแมวเปอร์เซีย อุ้งเท้าเล็กค่อนข้างกลมมน สะโพกใหญ่  ตรงแผงคอจะมีขนยาว หน้าท้องมีขนดก ที่นิ้วเท้าและปลายหูมีขนเป็นกระจุก ขนสีขาว นัยน์ตาสีฟ้า ทองแดง เขียว ทองและตาสองสี อุ้งฝ่าเท้า ริมฝีปาก และจมูกสีชมพู\n นิสัย: ฉลาด แคล่วคล่อง ขี้เล่น มีพลังงานสูงแต่ก็อ้อนเจ้าของมาก ชอบอยู่ใกล้คน ชอบปีนป่ายและสำรวจ ติดคนพอสมควร เข้ากับเด็กและสัตว์เลี้ยงอื่นได้ดี เหมาะกับบ้านที่มีเวลาให้เล่นหรือมีพื้นที่ให้ปีน',
' เคล็ดลับในการดูแล: แปรงขน 1–2 ครั้งต่อสัปดาห์ เพราะขนแองโกราไม่พันกันง่ายเท่าเพอร์เซียน แต่การแปรงช่วยลดขนร่วงและทำให้ขนสวย จัดอาหารที่ช่วยเสริมกล้ามเนื้อและพลังงาน เนื่องจากแองโกราเป็นแมวขยับตัวเยอะ และหมั่นตรวจสุขภาพเป็นประจำ',
'https://tse3.mm.bing.net/th/id/OIP.9BMxF2n7PpD6bwl-dP1ongHaE8?rs=1&pid=ImgDetMain&o=7&rm=3'
),
-- 9. Ragamuffin
(
'Ragamuffin',
'United States',
'ประวัติความเป็นมา\n ประวัติของแมวสายพันธุ์นี้เริ่มต้นขึ้นในปี ค.ศ. 1960  คุณ Ann Baker ซึ่งเป็นผู้ที่เพาะพันธุ์แมวสายพันธุ์ Ragdoll เป็นครั้งแรก หลังจากที่เธอทำการเพาะพันธุ์เจ้า Ragdoll สำเร็จแล้ว เหล่าบรรดาผู้เพาะพันธุ์แมวท่านอื่นต้องการที่จะเพิ่มความหลากหลายให้กับสีขน ขนาดตัว และลักษณะภายนอกในแมวชนิดนี้ แต่ว่าคุณ Ann Baker นั้นไม่เห็นด้วยกับการกระทำดังกล่าว กลุ่มผู้เพาะพันธุ์แมวบางส่วนจึงได้ออกมาทำการทดลองเพาะพันธุ์แมวเอง เหล่าผู้เพาะพันธุ์กลุ่มนี้ได้ทำการนำเจ้า Ragdoll มาผสมข้ามสายพันธุ์กับแมวพันธุ์ Persain, Himalayan, และแมวบ้านที่มีขนยาวชนิดอื่น ขนมันกลายออกมาเป็นแมวสายพันธุ์ใหม่ที่มีชื่อว่า Ragamuffin ที่พวกเรารู้จักกัน ที่มีสีตาและสีขนที่แตกต่างจากเจ้า Ragdoll และแล้วมันก็ได้รับการยอมรับอย่างเป็นทางการจากองค์กร Cat Fanciers’ Association ในปี ค.ศ. 2011 \nลักษณะเด่นและนิสัย\n รูปลักษณ์: มีขนาดใหญ่ ตัวแน่น โครงร่างเป็นทรงคล้ายสี่เหลี่ยมผืนผ้า อกกว้าง มีความทรงพลัง ใบหน้าน่ารัก ด้วยรูปตาที่เป็นทรงคล้ายลูกวอลนัท ใบหูมีขนปกคลุม ท่าทีดูสง่างาม มาพร้อมกับขนกึ่งยาวที่มีสัมผัสนุ่มฟู เสริมไปด้วยแผงคอยาวสลวย ขนหางฟู ๆ และอุ้งเท้าฟูนุ่ม\n นิสัย: ฉลาด เข้าใจง่าย ไม่ก้าวร้าว อ่อนหวาน ผ่อนคลาย เจ้าเสน่ห์ ขี้เล่นขี้สงสัย เข้ากับคนง่ายและต้องการการดูแล',
' เคล็ดลับในการดูแล: แปรงขน 2–3 ครั้งต่อสัปดาห์ เพื่อป้องกันขนพันกันและคุมขนร่วง จะเติบโตได้ดีด้วยการรับประทานอาหารที่มีโปรตีนสูง และคาร์โบไฮเดรตต่ำซึ่งช่วยป้องกันโรคอ้วนพาไปเดินบ่อยเป็นการออกกำลังกายและ เอาใจใส่มากๆเนื่องจากมีความเสี่ยงเป็นโรคทางพันธุกรรมสูง ',
'https://cattime.com/wp-content/uploads/sites/14/2011/12/GettyImages-1141850968.jpg'
),
-- 10. Somali
(
'Somali',
'United States',
'ประวัติความเป็นมา\nมีต้นกำเนิดที่ประเทศสหรัฐอเมริกา โดยในช่วงศตวรรษที่ 20 ชาวอเมริกันบางท่านได้นำแมวสายพันธุ์ Abyssinian มาผสมข้ามสายพันธุ์กับแมวขนยาวบางชนิด จนมักลายออกมาเป็นเจ้า Somali ที่มีลักษณะภายนอกคล้ายคลึงกับเจ้า Abyssinian เป็นอย่างมาก สิ่งที่แตกต่างกันโดยหลักๆ จะเป็นเรื่องความยาวขน เจ้าโซมาลีจะมีขนที่ยาวกว่าอย่างเห็นได้ชัด ในปัจจุบัน มันเป็นแมวสายพันธุ์ที่ได้รับความนิยมและหาตัวค่อนข้างยากพอสมควร\nลักษณะเด่นและนิสัย\n รูปลักษณ์: ขนาดกลาง ตัวเพรียว athletic กล้ามเนื้อดี ใบหน้ารูปสามเหลี่ยมอ่อน ๆ หูใหญ่ ดวงตาโตสีทอง/เขียว ขนยาวปานกลาง ฟูรอบคอและหาง (หางฟูเหมือนจิ้งจอก)\n นิสัย: ขี้เล่น ขยับตัวทั้งวันไม่ค่อยอยู่นิ่ง ชอบปีนป่าย สำรวจ และเล่นกับคน เป็นมิตร ติดเจ้าของ ฉลาด ช่างสังเกตและอยากรู้อยากเห็น',
' เคล็ดลับในการดูแล: แปรงขนสัปดาห์ละ 1-2 ครั้ง เพื่อป้องกันการพันกันของขน ควรให้อาหารที่มีคุณภาพสูงและเหมาะสมกับความต้องการทางโภชนาการ ควรมีเวลาเล่นและมีกิจกรรมที่ช่วยให้มันได้เคลื่อนไหว เช่น ปีนป่าย',
'https://meowbarn.com/wp-content/uploads/2022/03/shutterstock_389580601.jpg'
);


-- ===================== INSERT USERS & ADMIN =====================

-- สร้าง Users ทั่วไป
-- หมายเหตุ: password_hash ในตัวอย่างนี้เป็นการ hash จาก bcrypt สำหรับรหัสผ่าน "password123"
-- ในการใช้งานจริงควรใช้ bcrypt หรือ argon2 ในการ hash รหัสผ่าน

INSERT INTO users (username, email, password_hash, is_active) VALUES
-- Admin user (password: admin123)
('admin', 'admin@catbreeds.com', '$2a$12$Jh17GEOUujYkjq/l/8JFsuSL.6xNamnMKVPWmyHskZZZUGU24Gbwq', true),

-- Regular users (password: password123)
('john_doe', 'john@example.com', '$2a$12$X./jfZnL4iH5tRwPdKO16OCDu5McGtDrwNIjjxItukO0rZzkjXFNe', true),
-- Regular users (password: password1234)
('jane_smith', 'jane@example.com', '$2a$12$5.XT7TZatli8vo3/Wsiez.OLaEc.AcTT29xVXeHKTqSC3hBGr6s..', true);

-- ===================== INSERT ROLES =====================

INSERT INTO roles (name) VALUES
('admin'),
('user');
-- ===================== INSERT PERMISSIONS =====================

INSERT INTO permissions (name) VALUES
-- Breed Management
('breed.create'),
('breed.read'),
('breed.update'),
('breed.delete'),

-- Discussion Management
('discussion.create'),
('discussion.read'),
('discussion.update'),
('discussion.delete'),

-- Reaction Management
('reaction.create'),
('reaction.delete'),

-- User Management
('user.read'),
('user.update'),
('user.delete'),
('user.manage_roles'),

-- Audit
('audit.read');

-- ===================== ASSIGN ROLES TO USERS =====================

-- Regular users get user role
INSERT INTO user_roles (user_id, role_id) VALUES
(1, 1), -- admin user gets admin role
(2, 2), -- john_doe gets user role
(3, 2); -- jane_smith gets user role

-- ===================== ASSIGN PERMISSIONS TO ROLES =====================

-- Admin role gets ALL permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT 1, id FROM permissions;


-- User role permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT 2, id FROM permissions
WHERE name IN (
    'breed.read',
    'discussion.create', 'discussion.read', 'discussion.update', 'discussion.delete',
    'reaction.create', 'reaction.delete'
);



-- ===================== UPDATE LAST LOGIN =====================

UPDATE users
SET last_login = CURRENT_TIMESTAMP
WHERE id IN (1, 2, 3);

-- ===================== USER FAVORITES =====================

CREATE TABLE user_favorites (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    breed_id INTEGER NOT NULL REFERENCES cat_breeds(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, breed_id)
);

CREATE INDEX idx_user_favorites_user_id ON user_favorites(user_id);